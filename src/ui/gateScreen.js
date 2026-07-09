import {
  isMockMode,
  isValidSolanaAddress,
  connectWallet,
  connectWithAddress,
  verifyStoredAddress,
  toggleMockHolder,
  openBuyLink,
  disconnectWallet,
  HOLDER_THRESHOLD,
} from '../wallet/index.js';

const MODE = Object.freeze({
  SILENT_CHECK: 'silent_check',
  AWAITING_INPUT: 'awaiting_input',
  CHECKING: 'checking',
  REJECTED: 'rejected',
  ERROR: 'error',
  VERIFIED: 'verified',
});

function formatBalance(n) {
  if (n == null) return '0';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2);
}

function formatThreshold(n) {
  return n.toLocaleString('en-US');
}

export class GateScreen {
  constructor() {
    this.root = document.getElementById('gate-screen');
    this.statusEl = this.root.querySelector('[data-slot=status]');
    this.thresholdEl = this.root.querySelector('[data-slot=threshold]');
    this.inputWrap = this.root.querySelector('[data-slot=input-wrap]');
    this.addressInput = this.root.querySelector('[data-slot=address]');
    this.inputError = this.root.querySelector('[data-slot=input-error]');
    this.primaryBtn = this.root.querySelector('[data-slot=primary]');
    this.buyBtn = this.root.querySelector('[data-slot=buy]');
    this.disconnectBtn = this.root.querySelector('[data-slot=disconnect]');
    this.mockSection = this.root.querySelector('[data-slot=mock]');
    this.mockToggleBtn = this.root.querySelector('[data-slot=mock-toggle]');

    this.mode = MODE.SILENT_CHECK;
    this.busy = false;
    this.resolveVerified = null;
    this._verifiedPromise = new Promise((resolve) => { this.resolveVerified = resolve; });

    this.thresholdEl.textContent = formatThreshold(HOLDER_THRESHOLD);

    this.primaryBtn.addEventListener('click', () => this.onPrimary());
    this.buyBtn.addEventListener('click', () => openBuyLink());
    this.disconnectBtn.addEventListener('click', () => this.onDisconnect());
    this.addressInput.addEventListener('input', () => { this.inputError.textContent = ''; });
    this.addressInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this.onPrimary(); }
    });

    if (isMockMode()) {
      this.mockSection.hidden = false;
      this.mockToggleBtn.addEventListener('click', async () => {
        if (this.busy) return;
        this.busy = true;
        try {
          const state = await toggleMockHolder();
          if (state.isHolder) {
            this.showVerified(state);
          } else {
            this.showRejected(state);
          }
        } finally {
          this.busy = false;
        }
      });
    }
  }

  awaitVerified() {
    return this._verifiedPromise;
  }

  async begin() {
    if (isMockMode()) {
      this.setMode(MODE.AWAITING_INPUT);
      this.statusEl.textContent = 'mock mode — press CONNECT or use TOGGLE HOLDER';
      this.statusEl.classList.remove('holder', 'non-holder', 'error');
      this.primaryBtn.textContent = 'CONNECT MOCK WALLET';
      this.inputWrap.hidden = true;
      return;
    }

    this.statusEl.textContent = 'checking cached wallet…';
    try {
      const state = await verifyStoredAddress();
      if (state?.isHolder) {
        this.showVerified(state);
        return;
      }
    } catch (err) {
      console.warn('[gate] cached verify failed', err);
    }

    this.setMode(MODE.AWAITING_INPUT);
    this.statusEl.textContent = 'paste your solana address to enter';
    this.statusEl.classList.remove('holder', 'non-holder', 'error');
    this.inputWrap.hidden = false;
    this.primaryBtn.textContent = 'VERIFY WALLET';
    setTimeout(() => this.addressInput.focus(), 60);
  }

  setMode(mode) {
    this.mode = mode;
  }

  async onPrimary() {
    if (this.busy) return;
    if (isMockMode()) {
      this.busy = true;
      try {
        const state = await connectWallet();
        if (state.isHolder) this.showVerified(state);
        else this.showRejected(state);
      } finally {
        this.busy = false;
      }
      return;
    }

    if (this.mode === MODE.REJECTED || this.mode === MODE.ERROR) {
      this.setMode(MODE.AWAITING_INPUT);
      this.statusEl.textContent = 'paste your solana address to enter';
      this.statusEl.classList.remove('holder', 'non-holder', 'error');
      this.inputWrap.hidden = false;
      this.buyBtn.hidden = true;
      this.disconnectBtn.hidden = true;
      this.primaryBtn.textContent = 'VERIFY WALLET';
      setTimeout(() => this.addressInput.focus(), 60);
      return;
    }

    const addr = (this.addressInput.value || '').trim();
    if (!isValidSolanaAddress(addr)) {
      this.inputError.textContent = 'invalid solana address';
      return;
    }
    this.inputError.textContent = '';

    this.busy = true;
    this.primaryBtn.disabled = true;
    this.primaryBtn.textContent = 'CHECKING…';
    this.statusEl.textContent = 'reading $FB balance…';
    this.statusEl.classList.remove('holder', 'non-holder', 'error');

    try {
      const state = await connectWithAddress(addr);
      if (state.error) {
        this.showError(state.error);
      } else if (state.isHolder) {
        this.showVerified(state);
      } else {
        this.showRejected(state);
      }
    } catch (err) {
      this.showError(err?.message ?? 'balance read failed');
    } finally {
      this.busy = false;
      this.primaryBtn.disabled = false;
    }
  }

  async onDisconnect() {
    await disconnectWallet();
    this.addressInput.value = '';
    this.setMode(MODE.AWAITING_INPUT);
    this.statusEl.textContent = 'paste your solana address to enter';
    this.statusEl.classList.remove('holder', 'non-holder', 'error');
    this.inputWrap.hidden = false;
    this.buyBtn.hidden = true;
    this.disconnectBtn.hidden = true;
    this.primaryBtn.textContent = 'VERIFY WALLET';
    this.primaryBtn.disabled = false;
    setTimeout(() => this.addressInput.focus(), 60);
  }

  showVerified(state) {
    this.setMode(MODE.VERIFIED);
    this.statusEl.textContent = `✓ ${formatBalance(state.balance)} $FB verified — welcome to the alley`;
    this.statusEl.classList.add('holder');
    this.statusEl.classList.remove('non-holder', 'error');
    this.inputWrap.hidden = true;
    this.buyBtn.hidden = true;
    this.disconnectBtn.hidden = true;
    this.primaryBtn.textContent = 'ENTER GAME';
    this.primaryBtn.disabled = false;
    this.primaryBtn.onclick = () => this.dismiss(state);
    setTimeout(() => this.dismiss(state), 900);
  }

  showRejected(state) {
    this.setMode(MODE.REJECTED);
    const shortfall = HOLDER_THRESHOLD - (state.balance || 0);
    this.statusEl.textContent = `only ${formatBalance(state.balance)} $FB — need ${formatBalance(shortfall)} more`;
    this.statusEl.classList.add('non-holder');
    this.statusEl.classList.remove('holder', 'error');
    this.inputWrap.hidden = true;
    this.buyBtn.hidden = false;
    this.disconnectBtn.hidden = isMockMode();
    this.primaryBtn.textContent = 'TRY ANOTHER ADDRESS';
    this.primaryBtn.disabled = false;
  }

  showError(msg) {
    this.setMode(MODE.ERROR);
    this.statusEl.textContent = `error: ${msg}`;
    this.statusEl.classList.add('error');
    this.statusEl.classList.remove('holder', 'non-holder');
    this.inputWrap.hidden = false;
    this.buyBtn.hidden = true;
    this.disconnectBtn.hidden = true;
    this.primaryBtn.textContent = 'RETRY VERIFY';
    this.primaryBtn.disabled = false;
  }

  dismiss(state) {
    if (this._dismissed) return;
    this._dismissed = true;
    this.root.classList.add('hidden');
    setTimeout(() => {
      this.root.setAttribute('aria-hidden', 'true');
      this.root.style.display = 'none';
    }, 420);
    this.resolveVerified?.(state);
  }
}
