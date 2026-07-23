const STORAGE_KEY = 'bb.skin';

export const SKIN_DEFS = Object.freeze({
  neon: {
    id: 'neon',
    label: 'NEON TOXIC',
    swatch: '#39ff14',
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
    tints: {
      green: 0x9dff9d,
      purple: 0xffb3f7,
      blue: 0xa8daff,
      red: 0xff9db1,
      yellow: 0xfff6a8,
      grey: 0xe6dfe0,
    },
  },
  chrome: {
    id: 'chrome',
    label: 'MONO CHROME',
    swatch: '#d0d0d0',
    tints: {
      green: 0xd0d0d0,
      purple: 0xd0d0d0,
      blue: 0xd0d0d0,
      red: 0xd0d0d0,
      yellow: 0xd0d0d0,
      grey: 0xd0d0d0,
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
