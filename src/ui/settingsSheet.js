export class SettingsSheet {
  constructor({ id, player, actions = {} }) {
    this.root = document.getElementById(id);
    if (!this.root) throw new Error(`settings sheet ${id} not found`);
    this.player = player;
    this.actions = actions;

    this.scrim = this.root.querySelector('.settings-scrim');
    this.closeBtn = this.root.querySelector('[data-slot=close]');
    this.toggleBtn = this.root.querySelector('[data-slot=toggle]');
    this.toggleState = this.root.querySelector('[data-slot=toggle-state]');
    this.volume = this.root.querySelector('[data-slot=volume]');
    this.trackEl = this.root.querySelector('[data-slot=track]');

    this.closeBtn?.addEventListener('click', () => this.hide());
    this.scrim?.addEventListener('click', () => this.hide());

    if (this.toggleBtn && player) {
      this.toggleBtn.addEventListener('click', () => {
        this.player.toggleMuted();
        if (!this.player.muted) this.player.tryUnlock();
      });
    }

    if (this.volume && player) {
      this.volume.addEventListener('input', () => {
        this.player.setVolume(Number(this.volume.value) / 100);
        this.player.tryUnlock();
      });
    }

    for (const [slot, handler] of Object.entries(actions)) {
      const btn = this.root.querySelector(`[data-slot=${slot}]`);
      if (btn) {
        btn.addEventListener('click', () => {
          this.hide();
          handler();
        });
      }
    }

    if (this.player) {
      this.unsubscribe = this.player.onChange((s) => this.render(s));
    }
  }

  show() {
    this.root.hidden = false;
    this.root.classList.remove('closing');
    if (this.player) this.render(this.player.getState());
  }

  hide() {
    this.root.classList.add('closing');
    setTimeout(() => {
      this.root.hidden = true;
      this.root.classList.remove('closing');
    }, 200);
  }

  isOpen() {
    return !this.root.hidden;
  }

  render(state) {
    if (!state) return;
    const muted = state.muted || state.volume === 0;
    if (this.toggleBtn) {
      this.toggleBtn.setAttribute('aria-pressed', muted ? 'false' : 'true');
      if (this.toggleState) this.toggleState.textContent = muted ? 'OFF' : 'ON';
    }
    if (this.volume) {
      const volPct = Math.round(state.volume * 100);
      if (Number(this.volume.value) !== volPct) this.volume.value = String(volPct);
      this.volume.style.setProperty('--vol', `${volPct}%`);
    }
    if (this.trackEl) this.trackEl.textContent = state.title || '—';
  }
}
