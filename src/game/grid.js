export const GRID_SIZE = 8;

export const CELL_STATE = Object.freeze({
  EMPTY: 0,
  FILLED: 1,
  HAZARD: 2,
});

export function createEmptyGrid(size = GRID_SIZE) {
  const grid = new Array(size);
  for (let row = 0; row < size; row++) {
    grid[row] = new Array(size).fill(CELL_STATE.EMPTY);
  }
  return grid;
}

export function isInBounds(row, col, size = GRID_SIZE) {
  return row >= 0 && row < size && col >= 0 && col < size;
}

export function getCell(grid, row, col) {
  if (!isInBounds(row, col, grid.length)) return undefined;
  return grid[row][col];
}
