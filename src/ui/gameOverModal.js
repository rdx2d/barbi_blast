import {
  isMockMode,
  readWalletState,
  connectWallet,
  connectWithAddress,
  toggleMockHolder,
  openBuyLink,
  isValidSolanaAddress,
  HOLDER_THRESHOLD,
} from '../wallet/index.js';

const MODE = Object.freeze({
  DISCONNECTED: 'disconnected',
  AWAITING_ADDRESS: 'awaiting_address',
  CHECKING: 'checking',
  HOLDER: 'holder',
  NON_HOLDER: 'non_holder',
});

export class GameOverModal {
  constructor({ onRevive, onPlayAgain }) {
    this.onRevive = onRevive;
    this.onPlayAgain = onPlayAgain;

    this.root = document.getElementById('game-over-modal');
    this.video = this.root.querySelector('.modal-video');
    this.scoreEl = this.root.querySelector('[data-slot=score]');
    this.highEl = this.root.querySelector('[data-slot=high]');
    this.statusEl = this.root.querySelector('[data-slot=wallet-status]');
    this.primaryBtn = this.root.querySelector('[data-slot=primary]');
    this.playAgainBtn = this.root.querySelector('[data-slot=play-again]');
    this.mockSection = this.root.querySelector('[data-slot=mock]');
    this.mockToggleBtn = this.root.querySelector('[data-slot=mock-toggle]');
    this.inputWrap = this.root.querySelector('[data-slot=input-wrap]');
    this.addressInput = this.root.querySelector('[data-slot=address-input]');
    this.inputError = this.root.querySelector('[data-slot=input-error]');

    this.currentMode = MODE.DISCONNECTED;
    this.busy = false;

    this.primaryBtn.addEventListener('click', () => this.onPrimaryClick());
    this.playAgainBtn.addEventListener('click', () => this.onPlayAgainClick());
    this.addressInput?.addEventListener('input', () => {
      this.inputError.textContent = '';
    });
    this.addressInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.onPrimaryClick();
      }
    });

    if (isMockMode()) {
      this.mockSection.hidden = false;
      this.mockToggleBtn.addEventListener('click', async () => {
        if (this.busy) return;
        this.busy = true;
        try {
          const state = await toggleMockHolder();
          this.applyWalletState(state);
        } finally {
          this.busy = false;
        }
      });
    }
  }

  async show({ score, high }) {
    this.scoreEl.textContent = String(score);
    this.highEl.textContent = String(high);
    this.statusEl.textContent = 'reading wallet...';
    this.statusEl.classList.remove('holder', 'non-holder');
    this.inputWrap.hidden = true;
    this.inputError.textContent = '';
    if (this.addressInput) this.addressInput.value = '';

    this.root.setAttribute('aria-hidden', 'false');
    this.root.classList.add('visible');

    if (this.video) {
      try {
        this.video.currentTime = 0;
        const p = this.video.play();
        if (p?.catch) p.catch(() => {});
      } catch {}
    }

    const state = await readWalletState();
    this.applyWalletState(state);
  }

  hide() {
    this.root.classList.remove('visible');
    this.root.setAttribute('aria-hidden', 'true');
    if (this.video) {
      try { this.video.pause(); } catch {}
    }
  }

  setPrimary(label, variant = 'primary') {
    this.primaryBtn.textContent = label;
    this.primaryBtn.classList.remove('primary', 'buy');
    this.primaryBtn.classList.add(variant);
  }

  applyWalletState(state) {
    this.primaryBtn.disabled = false;

    if (state?.error) {
      this.statusEl.textContent = `rpc error: ${state.error}`;
      this.statusEl.classList.add('non-holder');
      this.currentMode = MODE.DISCONNECTED;
      this.setPrimary('RETRY CONNECT');
      this.inputWrap.hidden = false;
      return;
    }

    if (!state?.connected) {
      this.currentMode = MODE.DISCONNECTED;
      this.statusEl.textContent = 'wallet not connected';
      this.statusEl.classList.remove('holder', 'non-holder');
      this.setPrimary('CONNECT WALLET');
      this.inputWrap.hidden = true;
      return;
    }

    if (state.isHolder) {
      this.currentMode = MODE.HOLDER;
      this.statusEl.textContent = `${formatBalance(state.balance)} $FB • holder verified`;
      this.statusEl.classList.add('holder');
      this.statusEl.classList.remove('non-holder');
      this.setPrimary('FROG ROCKET REVIVE');
      this.inputWrap.hidden = true;
    } else {
      this.currentMode = MODE.NON_HOLDER;
      this.statusEl.textContent = `only ${formatBalance(state.balance)} $FB • need ${HOLDER_THRESHOLD}+`;
      this.statusEl.classList.add('non-holder');
      this.statusEl.classList.remove('holder');
      this.setPrimary('BUY $FB ON PUMP.FUN', 'buy');
      this.inputWrap.hidden = true;
    }
  }

  async onPrimaryClick() {
    if (this.busy) return;
    this.busy = true;
    try {
      if (this.currentMode === MODE.DISCONNECTED) {
        if (isMockMode()) {
          const state = await connectWallet();
          this.applyWalletState(state);
        } else if (this.inputWrap.hidden) {
          this.inputWrap.hidden = false;
          this.setPrimary('VERIFY BALANCE');
          this.currentMode = MODE.AWAITING_ADDRESS;
          this.addressInput?.focus();
        }
      } else if (this.currentMode === MODE.AWAITING_ADDRESS) {
        const addr = (this.addressInput?.value ?? '').trim();
        if (!isValidSolanaAddress(addr)) {
          this.inputError.textContent = 'invalid solana address';
          return;
        }
        this.inputError.textContent = '';
        this.statusEl.textContent = 'reading $FB balance...';
        this.primaryBtn.disabled = true;
        this.primaryBtn.textContent = 'CHECKING...';
        try {
          const state = await connectWithAddress(addr);
          this.applyWalletState(state);
        } catch (err) {
          this.statusEl.textContent = `error: ${err.message}`;
          this.statusEl.classList.add('non-holder');
          this.primaryBtn.disabled = false;
          this.setPrimary('RETRY');
        }
      } else if (this.currentMode === MODE.HOLDER) {
        this.hide();
        this.onRevive?.();
      } else if (this.currentMode === MODE.NON_HOLDER) {
        openBuyLink();
      }
    } finally {
      this.busy = false;
    }
  }

  onPlayAgainClick() {
    if (this.busy) return;
    this.hide();
    this.onPlayAgain?.();
  }
}

function formatBalance(n) {
  if (n == null) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2);
}
