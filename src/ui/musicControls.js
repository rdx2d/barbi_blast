export class MusicControls {
  constructor({ player }) {
    this.player = player;
    this.root = document.getElementById('music-hud');
    this.btn = document.getElementById('music-btn');
    this.panel = document.getElementById('music-panel');
    this.toggleBtn = this.panel.querySelector('[data-slot=toggle]');
    this.toggleState = this.panel.querySelector('[data-slot=toggle-state]');
    this.volume = this.panel.querySelector('[data-slot=volume]');
    this.trackEl = this.panel.querySelector('[data-slot=track]');

    this.open = false;

    this.btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setOpen(!this.open);
    });

    this.toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.player.toggleMuted();
    });

    this.volume.addEventListener('input', () => {
      const v = Number(this.volume.value) / 100;
      this.player.setVolume(v);
    });

    this.panel.addEventListener('click', (e) => e.stopPropagation());

    document.addEventListener('click', () => {
      if (this.open) this.setOpen(false);
    });

    this.unsubscribe = this.player.onChange((s) => this.render(s));
    this.render(this.player.getState());
  }

  setOpen(open) {
    this.open = open;
    this.panel.hidden = !open;
    this.btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  render(state) {
    const muted = state.muted || state.volume === 0;

    this.btn.dataset.state = muted ? 'muted' : 'playing';
    this.toggleBtn.setAttribute('aria-pressed', muted ? 'false' : 'true');
    this.toggleState.textContent = muted ? 'OFF' : 'ON';

    const volPct = Math.round(state.volume * 100);
    if (Number(this.volume.value) !== volPct) {
      this.volume.value = String(volPct);
    }
    this.volume.style.setProperty('--vol', `${volPct}%`);

    this.trackEl.textContent = state.title || '—';
  }
}
