import * as mock from './mockWallet.js';
import { FB_MINT, HOLDER_THRESHOLD, PUMP_FUN_URL, RPC_ENDPOINT } from './constants.js';
import { readFbBalance, isValidSolanaAddress } from './solana.js';

export { FB_MINT, HOLDER_THRESHOLD, PUMP_FUN_URL, RPC_ENDPOINT, isValidSolanaAddress };

const isTelegram = () => Boolean(window.Telegram?.WebApp?.initData);
const hasMockParam = () => new URLSearchParams(location.search).has('mock');
const MOCK_MODE = hasMockParam() || !isTelegram();

export function isMockMode() {
  return MOCK_MODE;
}

let realWalletAddress = null;
let cachedRealState = null;

function classify(balance) {
  return balance >= HOLDER_THRESHOLD;
}

export async function readWalletState() {
  if (MOCK_MODE) {
    const m = mock.getMock();
    const connected = m.state !== mock.MOCK_STATE.DISCONNECTED;
    return {
      connected,
      address: m.address,
      balance: m.balance,
      isHolder: classify(m.balance),
      mock: true,
      mockState: m.state,
      error: null,
    };
  }

  if (!realWalletAddress) {
    return { connected: false, address: null, balance: 0, isHolder: false, mock: false, mockState: null, error: null };
  }

  if (cachedRealState) return cachedRealState;

  try {
    const { balance } = await readFbBalance(realWalletAddress);
    cachedRealState = {
      connected: true,
      address: realWalletAddress,
      balance,
      isHolder: classify(balance),
      mock: false,
      mockState: null,
      error: null,
    };
    return cachedRealState;
  } catch (err) {
    return {
      connected: false,
      address: null,
      balance: 0,
      isHolder: false,
      mock: false,
      mockState: null,
      error: err?.message ?? 'balance read failed',
    };
  }
}

export async function connectWallet() {
  if (MOCK_MODE) {
    mock.connectMockAsNonHolder();
    return readWalletState();
  }
  throw new Error('use connectWithAddress in real mode');
}

export async function connectWithAddress(address) {
  if (MOCK_MODE) {
    return connectWallet();
  }
  const trimmed = (address ?? '').trim();
  if (!isValidSolanaAddress(trimmed)) {
    throw new Error('invalid solana address');
  }
  realWalletAddress = trimmed;
  cachedRealState = null;
  return readWalletState();
}

export async function disconnectWallet() {
  if (MOCK_MODE) {
    mock.disconnectMock();
    return readWalletState();
  }
  realWalletAddress = null;
  cachedRealState = null;
  return readWalletState();
}

export async function toggleMockHolder() {
  if (!MOCK_MODE) return readWalletState();
  mock.toggleMockHolder();
  return readWalletState();
}

export function openBuyLink() {
  const tg = window.Telegram?.WebApp;
  if (tg && typeof tg.openLink === 'function') {
    tg.openLink(PUMP_FUN_URL, { try_instant_view: false });
    return;
  }
  window.open(PUMP_FUN_URL, '_blank', 'noopener,noreferrer');
}
