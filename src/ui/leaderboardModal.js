import { fetchLeaderboard } from '../net/api.js';

function formatScore(n) {
  if (n == null) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export class LeaderboardModal {
  constructor() {
    this.root = document.getElementById('leaderboard-modal');
    if (!this.root) throw new Error('leaderboard-modal shell missing');
    this.scrim = this.root.querySelector('.settings-scrim');
    this.closeBtn = this.root.querySelector('[data-slot=close]');
    this.globalTab = this.root.querySelector('[data-slot=tab-global]');
    this.weekTab = this.root.querySelector('[data-slot=tab-week]');
    this.statusEl = this.root.querySelector('[data-slot=status]');
    this.listEl = this.root.querySelector('[data-slot=list]');
    this.youEl = this.root.querySelector('[data-slot=you]');

    this.scope = 'global';
    this.loadingToken = 0;

    this.closeBtn?.addEventListener('click', () => this.hide());
    this.scrim?.addEventListener('click', () => this.hide());
    this.globalTab.addEventListener('click', () => this.setScope('global'));
    this.weekTab.addEventListener('click', () => this.setScope('week'));
  }

  async show() {
    this.root.hidden = false;
    this.root.classList.remove('closing');
    await this.load();
  }

  hide() {
    this.root.classList.add('closing');
    setTimeout(() => {
      this.root.hidden = true;
      this.root.classList.remove('closing');
    }, 200);
  }

  setScope(scope) {
    if (this.scope === scope) return;
    this.scope = scope;
    this.globalTab.setAttribute('aria-selected', scope === 'global' ? 'true' : 'false');
    this.weekTab.setAttribute('aria-selected', scope === 'week' ? 'true' : 'false');
    this.load();
  }

  async load() {
    const token = ++this.loadingToken;
    this.setStatus('loading…', '');
    this.listEl.innerHTML = '';
    this.youEl.hidden = true;

    const data = await fetchLeaderboard(this.scope);
    if (token !== this.loadingToken) return;

    if (!data) {
      this.setStatus('couldn’t reach the leaderboard — tap a tab to retry', 'error');
      return;
    }

    if (!data.rows || data.rows.length === 0) {
      this.setStatus('no scores yet — go be the first', 'empty');
    } else {
      this.setStatus('', '');
      for (const row of data.rows) {
        const li = document.createElement('li');
        li.className = 'lb-row';
        if (data.me && row.rank === data.me.rank && row.score === data.me.score) {
          li.classList.add('is-you');
        }
        li.innerHTML = `
          <span class="lb-rank">#${row.rank}</span>
          <span class="lb-name"></span>
          <span class="lb-score">${formatScore(row.score)}</span>
        `;
        li.querySelector('.lb-name').textContent = row.name;
        this.listEl.appendChild(li);
      }
    }

    if (data.me) {
      this.youEl.hidden = false;
      this.youEl.innerHTML = `
        <span class="lb-you-label">YOU · #${data.me.rank}</span>
        <span class="lb-score">${formatScore(data.me.score)}</span>
      `;
    }
  }

  setStatus(text, klass) {
    this.statusEl.textContent = text;
    this.statusEl.className = 'lb-status' + (klass ? ` ${klass}` : '');
    this.statusEl.style.display = text ? '' : 'none';
  }
}
