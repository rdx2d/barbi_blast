import { SKIN_DEFS, SKIN_ORDER, getActiveSkinId, setActiveSkin } from '../game/skins.js';

export class SkinPicker {
  constructor() {
    this.root = document.getElementById('skin-picker');
    if (!this.root) throw new Error('skin-picker shell missing');
    this.grid = this.root.querySelector('[data-slot=grid]');
    this.closeBtn = this.root.querySelector('[data-slot=close]');
    this.scrim = this.root.querySelector('.settings-scrim');

    this.closeBtn?.addEventListener('click', () => this.hide());
    this.scrim?.addEventListener('click', () => this.hide());

    this.buildGrid();
    window.addEventListener('bb:skin-changed', () => this.refresh());
  }

  buildGrid() {
    this.grid.innerHTML = '';
    for (const id of SKIN_ORDER) {
      const skin = SKIN_DEFS[id];
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'skin-chip';
      chip.dataset.id = id;
      chip.setAttribute('aria-pressed', 'false');
      chip.innerHTML = `
        <span class="skin-swatch" style="background:${skin.swatch}"></span>
        <span>${skin.label}</span>
      `;
      chip.addEventListener('click', () => setActiveSkin(id));
      this.grid.appendChild(chip);
    }
    this.refresh();
  }

  refresh() {
    const active = getActiveSkinId();
    for (const chip of this.grid.querySelectorAll('.skin-chip')) {
      chip.setAttribute('aria-pressed', chip.dataset.id === active ? 'true' : 'false');
    }
  }

  show() {
    this.refresh();
    this.root.hidden = false;
    this.root.classList.remove('closing');
  }

  hide() {
    this.root.classList.add('closing');
    setTimeout(() => {
      this.root.hidden = true;
      this.root.classList.remove('closing');
    }, 200);
  }
}
