import { submitSurvey } from '../net/api.js';

const DONE_KEY = 'bb.survey.done';

const QUESTIONS = [
  {
    id: 'platform',
    type: 'single',
    title: 'Where else should Barbi ship?',
    options: ['Android', 'iOS', 'Both — take my phone', 'Telegram is enough'],
  },
  {
    id: 'challenges',
    type: 'multi',
    title: "What's beating you up in the alley? (pick all that apply)",
    options: [
      'Pieces never fit when I need them',
      'Trash Drops are too brutal',
      'Game feels laggy on my phone',
      'The wallet gate is a hassle',
      "Nothing — I'm cruising",
    ],
  },
  {
    id: 'improvement',
    type: 'text',
    title: 'One thing you would change about the game?',
    placeholder: 'type it straight — we can take it',
  },
  {
    id: 'gate_comfort',
    type: 'single',
    title: '1.2M $FB (~$3) to enter — how does the gate feel?',
    options: ['Fair — keeps the alley exclusive', 'Too high', "I'd pay MORE for more perks", 'Should be free with locked features'],
  },
  {
    id: 'pay_more',
    type: 'single',
    title: 'If new premium perks dropped (exclusive skins, tournaments, revive packs) — would you stack more $FB?',
    options: ['Definitely', 'Depends on the perks', 'My bag is enough'],
  },
  {
    id: 'headspace',
    type: 'single',
    title: 'Real talk: does a Barbi Blast session help your headspace?',
    options: ["It's my chill ritual", 'Sometimes', 'Not really', 'It stresses me MORE 😤'],
  },
  {
    id: 'frequency',
    type: 'single',
    title: 'How often do you end up back in the alley?',
    options: ['Daily', 'A few times a week', 'Once in a while', 'This is my first run'],
  },
  {
    id: '_rating',
    type: 'stars',
    title: 'Last one — rate your Barbi Blast experience',
    placeholder: 'optional: leave a short review…',
  },
];

export function isSurveyDone() {
  try { return localStorage.getItem(DONE_KEY) === '1'; } catch { return false; }
}

function markSurveyDone() {
  try { localStorage.setItem(DONE_KEY, '1'); } catch {}
  const cs = window.Telegram?.WebApp?.CloudStorage;
  if (cs?.setItem) {
    try { cs.setItem(DONE_KEY, '1', () => {}); } catch {}
  }
}

export class SurveyModal {
  constructor({ onCompleted } = {}) {
    this.onCompleted = onCompleted;
    this.root = document.getElementById('survey-modal');
    if (!this.root) throw new Error('survey-modal shell missing');
    this.progressEl = this.root.querySelector('[data-slot=progress]');
    this.titleEl = this.root.querySelector('[data-slot=title]');
    this.bodyEl = this.root.querySelector('[data-slot=body]');
    this.backBtn = this.root.querySelector('[data-slot=back]');
    this.nextBtn = this.root.querySelector('[data-slot=next]');
    this.closeBtn = this.root.querySelector('[data-slot=close]');
    this.scrim = this.root.querySelector('.settings-scrim');

    this.step = 0;
    this.answers = {};
    this.rating = 0;
    this.review = '';
    this.submitting = false;

    this.closeBtn.addEventListener('click', () => this.hide());
    this.scrim.addEventListener('click', () => this.hide());
    this.backBtn.addEventListener('click', () => this.go(-1));
    this.nextBtn.addEventListener('click', () => this.onNext());
  }

  show() {
    this.step = 0;
    this.root.hidden = false;
    this.root.classList.remove('closing');
    this.renderStep();
  }

  hide() {
    this.root.classList.add('closing');
    setTimeout(() => {
      this.root.hidden = true;
      this.root.classList.remove('closing');
    }, 200);
  }

  go(delta) {
    this.captureCurrent();
    this.step = Math.max(0, Math.min(QUESTIONS.length - 1, this.step + delta));
    this.renderStep();
  }

  async onNext() {
    if (this.submitting) return;
    this.captureCurrent();
    if (this.step < QUESTIONS.length - 1) {
      this.step += 1;
      this.renderStep();
      return;
    }

    if (this.rating < 1) {
      this.progressEl.textContent = '// tap a star first //';
      return;
    }

    this.submitting = true;
    this.nextBtn.disabled = true;
    this.nextBtn.textContent = 'SENDING…';
    const result = await submitSurvey({ answers: this.answers, rating: this.rating, review: this.review });
    this.submitting = false;
    this.nextBtn.disabled = false;

    if (!result) {
      this.progressEl.textContent = '// send failed — try again //';
      this.nextBtn.textContent = 'RETRY SEND';
      return;
    }

    markSurveyDone();
    this.renderThanks();
    this.onCompleted?.();
  }

  captureCurrent() {
    const q = QUESTIONS[this.step];
    if (!q) return;
    if (q.type === 'text') {
      const ta = this.bodyEl.querySelector('.survey-text');
      if (ta) this.answers[q.id] = ta.value.trim();
    } else if (q.type === 'stars') {
      const ta = this.bodyEl.querySelector('.survey-text');
      if (ta) this.review = ta.value.trim();
    }
  }

  renderStep() {
    const q = QUESTIONS[this.step];
    const total = QUESTIONS.length;
    this.progressEl.textContent = `// survey ${this.step + 1}/${total} //`;
    this.titleEl.textContent = q.title;
    this.backBtn.disabled = this.step === 0;
    this.nextBtn.textContent = this.step === total - 1 ? 'SUBMIT ✓' : 'NEXT →';
    this.bodyEl.innerHTML = '';

    if (q.type === 'single' || q.type === 'multi') {
      const selected = this.answers[q.id] ?? (q.type === 'multi' ? [] : null);
      for (const opt of q.options) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'survey-option';
        btn.textContent = opt;
        const isSel = q.type === 'multi' ? selected.includes(opt) : selected === opt;
        btn.setAttribute('aria-pressed', isSel ? 'true' : 'false');
        btn.addEventListener('click', () => {
          if (q.type === 'single') {
            this.answers[q.id] = opt;
            for (const b of this.bodyEl.querySelectorAll('.survey-option')) {
              b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
            }
          } else {
            const cur = this.answers[q.id] ?? [];
            const idx = cur.indexOf(opt);
            if (idx >= 0) cur.splice(idx, 1);
            else cur.push(opt);
            this.answers[q.id] = cur;
            btn.setAttribute('aria-pressed', cur.includes(opt) ? 'true' : 'false');
          }
        });
        this.bodyEl.appendChild(btn);
      }
    } else if (q.type === 'text') {
      const ta = document.createElement('textarea');
      ta.className = 'survey-text';
      ta.placeholder = q.placeholder ?? '';
      ta.value = this.answers[q.id] ?? '';
      this.bodyEl.appendChild(ta);
    } else if (q.type === 'stars') {
      const wrap = document.createElement('div');
      wrap.className = 'survey-stars';
      for (let i = 1; i <= 5; i++) {
        const star = document.createElement('button');
        star.type = 'button';
        star.className = 'survey-star' + (i <= this.rating ? ' lit' : '');
        star.textContent = '★';
        star.setAttribute('aria-label', `${i} star${i > 1 ? 's' : ''}`);
        star.addEventListener('click', () => {
          this.rating = i;
          const stars = wrap.querySelectorAll('.survey-star');
          stars.forEach((s, idx) => s.classList.toggle('lit', idx < i));
        });
        wrap.appendChild(star);
      }
      this.bodyEl.appendChild(wrap);

      const ta = document.createElement('textarea');
      ta.className = 'survey-text';
      ta.placeholder = q.placeholder ?? '';
      ta.value = this.review;
      this.bodyEl.appendChild(ta);
    }
  }

  renderThanks() {
    this.progressEl.textContent = '// thank you //';
    this.titleEl.textContent = '';
    this.bodyEl.innerHTML = '<div class="survey-done">🙏 feedback received.<br/>the alley hears you.</div>';
    this.backBtn.disabled = true;
    this.nextBtn.textContent = 'CLOSE';
    this.nextBtn.onclick = () => {
      this.hide();
      this.nextBtn.onclick = null;
    };
  }
}
