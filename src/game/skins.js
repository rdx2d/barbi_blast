const STORAGE_KEY = 'bb.skin';

// base: 'color' renders blocks from the original colored Kenney sprites
//       (tint 0xffffff = pass-through, exact stock look).
//       'grey' renders every block from the neutral grey sprite and relies
//       on the tint to supply the color — required because Phaser tints
//       MULTIPLY with texture pixels, so tinting an already-saturated
//       green sprite pastel-pink produces almost no visible change.
export const SKIN_DEFS = Object.freeze({
  neon: {
    id: 'neon',
    label: 'NEON TOXIC',
    swatch: '#39ff14',
    base: 'color',
    tints: {
      green: 0xffffff,
      purple: 0xffffff,
      blue: 0xffffff,
      red: 0xffffff,
      yellow: 0xffffff,
      grey: 0xffffff,
    },
  },
  candy: {
    id: 'candy',
    label: 'CANDY PASTEL',
    swatch: '#ffb3f7',
    base: 'grey',
    tints: {
      green: 0x8affa0,
      purple: 0xffa3f0,
      blue: 0x8fd0ff,
      red: 0xff8fa8,
      yellow: 0xfff08f,
      grey: 0xf0e8ea,
    },
  },
  chrome: {
    id: 'chrome',
    label: 'MONO CHROME',
    swatch: '#d0d0d0',
    base: 'grey',
    tints: {
      green: 0xf2f2f2,
      purple: 0x9a9a9a,
      blue: 0xc6c6c6,
      red: 0x767676,
      yellow: 0xe0e0e0,
      grey: 0xb0b0b0,
    },
  },
});

export const SKIN_ORDER = Object.freeze(['neon', 'candy', 'chrome']);
export const DEFAULT_SKIN = 'neon';

export function getActiveSkinId() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && SKIN_DEFS[v]) return v;
  } catch {}
  return DEFAULT_SKIN;
}

export function getActiveSkin() {
  return SKIN_DEFS[getActiveSkinId()];
}

export function setActiveSkin(id) {
  if (!SKIN_DEFS[id]) return getActiveSkin();
  try { localStorage.setItem(STORAGE_KEY, id); } catch {}
  window.dispatchEvent(new CustomEvent('bb:skin-changed', { detail: { id } }));
  return SKIN_DEFS[id];
}

export function tintFor(colorKey) {
  const skin = getActiveSkin();
  return skin.tints[colorKey] ?? 0xffffff;
}

export function usesGreyBase() {
  return getActiveSkin().base === 'grey';
}
