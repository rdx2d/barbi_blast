import { CELL_STATE } from './grid.js';

export const ALLEY_EVENT_INTERVAL = 500;

export const EVENT_TYPES = Object.freeze({
  TRASH_DROP: 'trash_drop',
});

export const EVENT_META = Object.freeze({
  [EVENT_TYPES.TRASH_DROP]: {
    label: 'TRASH DROP',
    subtitle: 'the alley leaves its garbage behind',
  },
});

export function pickEvent(rng = Math.random) {
  const pool = [EVENT_TYPES.TRASH_DROP];
  return pool[Math.floor(rng() * pool.length)];
}

export function eventsDueAfterScoreCross(prevScore, nextScore, interval = ALLEY_EVENT_INTERVAL) {
  const prevBoundary = Math.floor(prevScore / interval);
  const nextBoundary = Math.floor(nextScore / interval);
  return Math.max(0, nextBoundary - prevBoundary);
}

export function runTrashDrop(grid, options = {}) {
  const { minCount = 2, maxCount = 3, rng = Math.random } = options;
  const size = grid.length;
  const empties = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === CELL_STATE.EMPTY) empties.push({ r, c });
    }
  }
  if (empties.length === 0) return { grid, placed: [] };

  for (let i = empties.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [empties[i], empties[j]] = [empties[j], empties[i]];
  }

  const wanted = minCount + Math.floor(rng() * (maxCount - minCount + 1));
  const targets = empties.slice(0, Math.min(wanted, empties.length));

  const next = grid.map((row) => row.slice());
  for (const { r, c } of targets) {
    next[r][c] = CELL_STATE.HAZARD;
  }
  return { grid: next, placed: targets };
}

export function runEvent(eventType, grid, options = {}) {
  switch (eventType) {
    case EVENT_TYPES.TRASH_DROP:
      return { type: eventType, ...runTrashDrop(grid, options) };
    default:
      return { type: eventType, grid, placed: [] };
  }
}
