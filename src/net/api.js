import { getRawInitData } from '../telegram/identity.js';

const TIMEOUT_MS = 5000;

async function withTimeout(promise) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await promise(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

export async function submitScore(score) {
  const initData = getRawInitData();
  if (!initData) {
    console.info('[api] no telegram auth, skipping score submit');
    return null;
  }
  try {
    return await withTimeout(async (signal) => {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, score }),
        signal,
      });
      if (!res.ok) {
        console.warn('[api] submit failed', res.status);
        return null;
      }
      return res.json();
    });
  } catch (err) {
    console.warn('[api] submit error', err?.name ?? err);
    return null;
  }
}

export async function fetchLeaderboard(scope = 'global') {
  try {
    return await withTimeout(async (signal) => {
      const headers = {};
      const initData = getRawInitData();
      if (initData) headers['X-Telegram-Init-Data'] = initData;
      const res = await fetch(`/api/leaderboard?scope=${encodeURIComponent(scope)}`, { headers, signal });
      if (!res.ok) {
        console.warn('[api] leaderboard failed', res.status);
        return null;
      }
      return res.json();
    });
  } catch (err) {
    console.warn('[api] leaderboard error', err?.name ?? err);
    return null;
  }
}
