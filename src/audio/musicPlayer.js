import { PLAYLIST } from './playlist.js';

const STORAGE_KEY_MUTED = 'bb.music.muted';
const STORAGE_KEY_VOLUME = 'bb.music.volume';
const DEFAULT_VOLUME = 0.55;

function readBool(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return v === '1';
  } catch { return fallback; }
}

function readFloat(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  } catch { return fallback; }
}

function writeBool(key, val) {
  try { localStorage.setItem(key, val ? '1' : '0'); } catch {}
}
function writeFloat(key, val) {
  try { localStorage.setItem(key, String(val)); } catch {}
}

function shuffleInPlace(arr, rng = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class MusicPlayer {
  constructor({ audioEl, tracks = PLAYLIST } = {}) {
    this.audio = audioEl ?? document.getElementById('bg-audio');
    if (!this.audio) throw new Error('MusicPlayer requires an <audio> element');
    this.tracks = tracks.slice();
    this.queue = [];
    this.currentIndex = -1;
    this.currentTrack = null;

    this.muted = readBool(STORAGE_KEY_MUTED, false);
    this.volume = readFloat(STORAGE_KEY_VOLUME, DEFAULT_VOLUME);
    this.listeners = new Set();
    this.unlocked = false;
    this.started = false;

    this.audio.preload = 'none';
    this.audio.loop = false;
    this.audio.volume = this.volume;
    this.audio.muted = this.muted;

    this.audio.addEventListener('ended', () => this.next());
    this.audio.addEventListener('error', () => {
      console.warn('[music] track error, skipping', this.currentTrack?.title);
      this.next();
    });

    this.refillQueue();
  }

  refillQueue() {
    const prevLast = this.currentTrack;
    const fresh = shuffleInPlace(this.tracks.slice());
    if (prevLast && fresh.length > 1 && fresh[0].src === prevLast.src) {
      [fresh[0], fresh[1]] = [fresh[1], fresh[0]];
    }
    this.queue = fresh;
  }

  async start() {
    if (this.started) return;
    if (this.queue.length === 0) this.refillQueue();
    const first = this.queue.shift();
    this.currentTrack = first;
    this.audio.src = first.src;
    this.emit();
    try {
      await this.audio.play();
      this.started = true;
      this.unlocked = true;
    } catch (err) {
      console.info('[music] autoplay blocked; will unlock on first pointer', err.name);
    }
  }

  async next() {
    if (this.queue.length === 0) this.refillQueue();
    const track = this.queue.shift();
    this.currentTrack = track;
    this.audio.src = track.src;
    this.emit();
    try {
      await this.audio.play();
      this.started = true;
      this.unlocked = true;
    } catch (err) {
      console.warn('[music] play failed on next()', err.name);
    }
  }

  async tryUnlock() {
    if (this.unlocked) return true;
    if (!this.currentTrack) {
      if (this.queue.length === 0) this.refillQueue();
      const first = this.queue.shift();
      this.currentTrack = first;
      this.audio.src = first.src;
      this.emit();
    }
    try {
      await this.audio.play();
      this.started = true;
      this.unlocked = true;
      this.emit();
      return true;
    } catch (err) {
      console.info('[music] unlock attempt failed', err?.name ?? err);
      return false;
    }
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    this.audio.muted = this.muted;
    writeBool(STORAGE_KEY_MUTED, this.muted);
    this.emit();
  }

  toggleMuted() {
    this.setMuted(!this.muted);
  }

  setVolume(v) {
    const clamped = Math.max(0, Math.min(1, Number(v) || 0));
    this.volume = clamped;
    this.audio.volume = clamped;
    writeFloat(STORAGE_KEY_VOLUME, clamped);
    if (clamped > 0 && this.muted) {
      this.setMuted(false);
      return;
    }
    this.emit();
  }

  getState() {
    return {
      muted: this.muted,
      volume: this.volume,
      title: this.currentTrack?.title ?? '—',
      unlocked: this.unlocked,
      started: this.started,
    };
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    const state = this.getState();
    for (const fn of this.listeners) {
      try { fn(state); } catch (e) { console.warn(e); }
    }
  }
}
