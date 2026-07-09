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
    this.inputWrap = this.root.querySelector('[data-slot=input-wrap]');

    if (this.inputWrap) this.inputWrap.hidden = true;
    if (this.mockSection) this.mockSection.hidden = true;
    if (this.statusEl) {
      this.statusEl.textContent = '✓ holder verified';
      this.statusEl.classList.add('holder');
    }
    this.primaryBtn.textContent = 'FROG ROCKET REVIVE';
    this.primaryBtn.classList.add('primary');

    this.primaryBtn.addEventListener('click', () => this.onPrimaryClick());
    this.playAgainBtn.addEventListener('click', () => this.onPlayAgainClick());
  }

  async show({ score, high }) {
    this.scoreEl.textContent = String(score);
    this.highEl.textContent = String(high);

    this.root.setAttribute('aria-hidden', 'false');
    this.root.classList.add('visible');

    if (this.video) {
      try {
        this.video.currentTime = 0;
        const p = this.video.play();
        if (p?.catch) p.catch(() => {});
      } catch {}
    }
  }

  hide() {
    this.root.classList.remove('visible');
    this.root.setAttribute('aria-hidden', 'true');
    if (this.video) {
      try { this.video.pause(); } catch {}
    }
  }

  onPrimaryClick() {
    this.hide();
    this.onRevive?.();
  }

  onPlayAgainClick() {
    this.hide();
    this.onPlayAgain?.();
  }
}
