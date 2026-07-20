const hasMockParam = () => new URLSearchParams(location.search).has('mock');

export function getRawInitData() {
  return window.Telegram?.WebApp?.initData || null;
}

export function getTelegramUser() {
  const unsafe = window.Telegram?.WebApp?.initDataUnsafe;
  const u = unsafe?.user;
  if (u && typeof u.id === 'number') {
    return {
      id: u.id,
      username: u.username ?? null,
      firstName: u.first_name ?? null,
      displayName: u.username || u.first_name || `player ${String(u.id).slice(-4)}`,
      mock: false,
    };
  }
  if (hasMockParam()) {
    return {
      id: 0,
      username: 'mock_player',
      firstName: 'Mock',
      displayName: 'mock_player',
      mock: true,
    };
  }
  return null;
}
