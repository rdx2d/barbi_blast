import { CELL_STATE } from './grid.js';

export function findClears(grid) {
  const size = grid.length;
  const rows = [];
  const cols = [];

  for (let r = 0; r < size; r++) {
    let full = true;
    for (let c = 0; c < size; c++) {
      if (grid[r][c] !== CELL_STATE.FILLED) { full = false; break; }
    }
    if (full) rows.push(r);
  }

  for (let c = 0; c < size; c++) {
    let full = true;
    for (let r = 0; r < size; r++) {
      if (grid[r][c] !== CELL_STATE.FILLED) { full = false; break; }
    }
    if (full) cols.push(c);
  }

  return { rows, cols };
}

export function clearedCellSet(rows, cols, size) {
  const set = new Set();
  for (const r of rows) {
    for (let c = 0; c < size; c++) set.add(`${r},${c}`);
  }
  for (const c of cols) {
    for (let r = 0; r < size; r++) set.add(`${r},${c}`);
  }
  return set;
}

export function applyClears(grid, rows, cols) {
  if (rows.length === 0 && cols.length === 0) return grid;
  const next = grid.map((r) => r.slice());
  const size = next.length;
  for (const r of rows) {
    for (let c = 0; c < size; c++) next[r][c] = CELL_STATE.EMPTY;
  }
  for (const c of cols) {
    for (let r = 0; r < size; r++) next[r][c] = CELL_STATE.EMPTY;
  }
  return next;
}

export function isFullBoardClear(grid) {
  for (const row of grid) {
    for (const cell of row) {
      if (cell !== CELL_STATE.EMPTY) return false;
    }
  }
  return true;
}
