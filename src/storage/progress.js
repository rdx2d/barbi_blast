const SNAPSHOT_KEY = 'bb.run.snapshot';
const SNAPSHOT_VERSION = 1;

function cloudStorage() {
  const cs = window.Telegram?.WebApp?.CloudStorage;
  return cs && typeof cs.setItem === 'function' ? cs : null;
}

export function saveRunSnapshot(snapshot) {
  const payload = JSON.stringify({ v: SNAPSHOT_VERSION, ...snapshot });
  try { localStorage.setItem(SNAPSHOT_KEY, payload); } catch {}
  const cs = cloudStorage();
  if (cs) {
    try { cs.setItem(SNAPSHOT_KEY, payload, () => {}); } catch {}
  }
}

export function clearRunSnapshot() {
  try { localStorage.removeItem(SNAPSHOT_KEY); } catch {}
  const cs = cloudStorage();
  if (cs) {
    try { cs.removeItem(SNAPSHOT_KEY, () => {}); } catch {}
  }
}

function parseSnapshot(payload) {
  try {
    const snap = JSON.parse(payload);
    if (!snap || snap.v !== SNAPSHOT_VERSION) return null;
    if (!Array.isArray(snap.grid) || snap.grid.length !== 8) return null;
    if (typeof snap.score !== 'number') return null;
    if (!Array.isArray(snap.tray)) return null;
    return snap;
  } catch {
    return null;
  }
}

export function loadRunSnapshot() {
  return new Promise((resolve) => {
    let local = null;
    try { local = parseSnapshot(localStorage.getItem(SNAPSHOT_KEY)); } catch {}
    if (local) {
      resolve(local);
      return;
    }
    const cs = cloudStorage();
    if (!cs) {
      resolve(null);
      return;
    }
    let settled = false;
    const finish = (value) => {
      if (!settled) { settled = true; resolve(value); }
    };
    setTimeout(() => finish(null), 1500);
    try {
      cs.getItem(SNAPSHOT_KEY, (err, value) => {
        if (err || !value) { finish(null); return; }
        finish(parseSnapshot(value));
      });
    } catch {
      finish(null);
    }
  });
}
