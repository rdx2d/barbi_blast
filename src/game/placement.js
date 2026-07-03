import { GRID_SIZE, CELL_STATE, isInBounds } from './grid.js';

export function canPlace(grid, shape, row, col) {
  const { matrix, rows, cols } = shape;
  if (row < 0 || col < 0) return false;
  if (row + rows > grid.length || col + cols > grid.length) return false;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (matrix[r][c] !== 1) continue;
      const gr = row + r;
      const gc = col + c;
      if (!isInBounds(gr, gc, grid.length)) return false;
      if (grid[gr][gc] !== CELL_STATE.EMPTY) return false;
    }
  }
  return true;
}

export function applyPlacement(grid, shape, row, col) {
  if (!canPlace(grid, shape, row, col)) {
    throw new Error(`invalid placement at ${row},${col} for ${shape.id}`);
  }
  const next = grid.map((r) => r.slice());
  const { matrix, rows, cols } = shape;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (matrix[r][c] === 1) {
        next[row + r][col + c] = CELL_STATE.FILLED;
      }
    }
  }
  return next;
}

export function hasAnyValidPlacement(grid, shape, size = GRID_SIZE) {
  for (let r = 0; r <= size - shape.rows; r++) {
    for (let c = 0; c <= size - shape.cols; c++) {
      if (canPlace(grid, shape, r, c)) return true;
    }
  }
  return false;
}
