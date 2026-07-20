export const COLOR_KEYS = Object.freeze(['green', 'purple', 'blue', 'red', 'yellow']);

const SHAPES_RAW = [
  { id: 'mono', tier: 1, matrix: [[1]] },

  { id: 'domino_h', tier: 1, matrix: [[1, 1]] },
  { id: 'domino_v', tier: 1, matrix: [[1], [1]] },

  { id: 'tri_h', tier: 2, matrix: [[1, 1, 1]] },
  { id: 'tri_v', tier: 2, matrix: [[1], [1], [1]] },

  { id: 'bar4_h', tier: 3, matrix: [[1, 1, 1, 1]] },
  { id: 'bar4_v', tier: 3, matrix: [[1], [1], [1], [1]] },
  { id: 'bar5_h', tier: 4, matrix: [[1, 1, 1, 1, 1]] },
  { id: 'bar5_v', tier: 4, matrix: [[1], [1], [1], [1], [1]] },

  { id: 'sq2', tier: 2, matrix: [[1, 1], [1, 1]] },
  { id: 'sq3', tier: 4, matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]] },

  { id: 'l_tri_ne', tier: 2, matrix: [[1, 1], [1, 0]] },
  { id: 'l_tri_nw', tier: 2, matrix: [[1, 1], [0, 1]] },
  { id: 'l_tri_se', tier: 2, matrix: [[1, 0], [1, 1]] },
  { id: 'l_tri_sw', tier: 2, matrix: [[0, 1], [1, 1]] },

  { id: 'l_tet_a', tier: 3, matrix: [[1, 0], [1, 0], [1, 1]] },
  { id: 'l_tet_b', tier: 3, matrix: [[0, 1], [0, 1], [1, 1]] },
  { id: 'l_tet_c', tier: 3, matrix: [[1, 1], [1, 0], [1, 0]] },
  { id: 'l_tet_d', tier: 3, matrix: [[1, 1], [0, 1], [0, 1]] },
  { id: 'l_tet_h_a', tier: 3, matrix: [[1, 1, 1], [1, 0, 0]] },
  { id: 'l_tet_h_b', tier: 3, matrix: [[1, 1, 1], [0, 0, 1]] },
  { id: 'l_tet_h_c', tier: 3, matrix: [[1, 0, 0], [1, 1, 1]] },
  { id: 'l_tet_h_d', tier: 3, matrix: [[0, 0, 1], [1, 1, 1]] },

  { id: 't_tet_up', tier: 3, matrix: [[1, 1, 1], [0, 1, 0]] },
  { id: 't_tet_down', tier: 3, matrix: [[0, 1, 0], [1, 1, 1]] },

  { id: 's_tet', tier: 3, matrix: [[0, 1, 1], [1, 1, 0]] },
  { id: 'z_tet', tier: 3, matrix: [[1, 1, 0], [0, 1, 1]] },
];

export const SHAPES = Object.freeze(
  SHAPES_RAW.map((s, index) => ({
    id: s.id,
    matrix: Object.freeze(s.matrix.map((row) => Object.freeze(row.slice()))),
    tier: s.tier,
    rows: s.matrix.length,
    cols: s.matrix[0].length,
    cells: s.matrix.flat().filter((v) => v === 1).length,
    index,
  })),
);

export const SHAPE_BY_ID = Object.freeze(
  Object.fromEntries(SHAPES.map((s) => [s.id, s])),
);

export function shapeCellCount(shape) {
  return shape.cells;
}

const TIER_WEIGHTS = Object.freeze({ 1: 4, 2: 3, 3: 2, 4: 1 });

export function pickRandomShape(rng = Math.random) {
  const weighted = [];
  for (const shape of SHAPES) {
    const w = TIER_WEIGHTS[shape.tier] ?? 1;
    for (let i = 0; i < w; i++) weighted.push(shape);
  }
  const idx = Math.floor(rng() * weighted.length);
  return weighted[idx];
}

export function pickRandomTray(count = 3, rng = Math.random) {
  const tray = [];
  for (let i = 0; i < count; i++) {
    tray.push({
      shape: pickRandomShape(rng),
      colorKey: COLOR_KEYS[Math.floor(rng() * COLOR_KEYS.length)],
      slot: i,
    });
  }
  return tray;
}
