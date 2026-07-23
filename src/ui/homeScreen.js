import { openBuyLink } from '../wallet/index.js';
import { getTelegramUser } from '../telegram/identity.js';

export class HomeScreen {
  constructor({ onPlay, onOpenLeaderboard, onOpenSettings }) {
    this.root = document.getElementById('home-screen');
    if (!this.root) throw new Error('home-screen shell missing');
    this.playBtn = this.root.querySelector('[data-slot=play]');
    this.leaderboardBtn = this.root.querySelector('[data-slot=leaderboard]');
    this.buyBtn = this.root.querySelector('[data-slot=buy]');
    this.userEl = this.root.querySelector('[data-slot=user]');
    this.gearBtn = document.getElementById('home-gear');

    this.playBtn.addEventListener('click', () => {
      this.hide();
      onPlay?.();
    });
    this.leaderboardBtn.addEventListener('click', () => onOpenLeaderboard?.());
    this.buyBtn.addEventListener('click', () => openBuyLink());
    this.gearBtn?.addEventListener('click', () => onOpenSettings?.());

    const user = getTelegramUser();
    if (user && this.userEl) {
      this.userEl.textContent = `logged in as @${user.displayName}`;
    }
  }

  show() {
    this.root.setAttribute('aria-hidden', 'false');
    this.root.classList.remove('leaving');
    if (this.gearBtn) this.gearBtn.hidden = false;
  }

  hide() {
    this.root.classList.add('leaving');
    if (this.gearBtn) this.gearBtn.hidden = true;
    setTimeout(() => {
      this.root.setAttribute('aria-hidden', 'true');
      this.root.classList.remove('leaving');
    }, 340);
  }
}
