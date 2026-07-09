import { FB_MINT, RPC_ENDPOINT, RPC_FALLBACKS } from './constants.js';

const SPL_TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

function getWeb3() {
  const web3 = window.solanaWeb3;
  if (!web3) throw new Error('solana web3 not loaded yet');
  return web3;
}

export function isValidSolanaAddress(str) {
  if (typeof str !== 'string') return false;
  const trimmed = str.trim();
  if (trimmed.length < 32 || trimmed.length > 44) return false;
  try {
    const web3 = getWeb3();
    const pk = new web3.PublicKey(trimmed);
    return web3.PublicKey.isOnCurve(pk.toBytes());
  } catch {
    return false;
  }
}

const connectionCache = new Map();
function connectionFor(endpoint) {
  if (!connectionCache.has(endpoint)) {
    const web3 = getWeb3();
    connectionCache.set(endpoint, new web3.Connection(endpoint, 'confirmed'));
  }
  return connectionCache.get(endpoint);
}

async function readFromProgramAt(endpoint, owner, programIdStr) {
  const web3 = getWeb3();
  const programId = new web3.PublicKey(programIdStr);
  const conn = connectionFor(endpoint);
  const res = await conn.getParsedTokenAccountsByOwner(owner, { programId });
  let total = 0;
  for (const acc of res.value) {
    const info = acc.account?.data?.parsed?.info;
    if (info?.mint !== FB_MINT) continue;
    const uiAmount = info.tokenAmount?.uiAmount;
    if (typeof uiAmount === 'number') total += uiAmount;
  }
  return total;
}

async function tryEndpoint(endpoint, owner) {
  const results = await Promise.allSettled([
    readFromProgramAt(endpoint, owner, SPL_TOKEN_PROGRAM_ID),
    readFromProgramAt(endpoint, owner, TOKEN_2022_PROGRAM_ID),
  ]);
  const errs = [];
  let anyOk = false;
  let total = 0;
  for (const r of results) {
    if (r.status === 'fulfilled') { anyOk = true; total += r.value; }
    else errs.push(r.reason?.message ?? String(r.reason));
  }
  if (!anyOk) throw new Error(errs[0] || 'unknown rpc error');
  return total;
}

export async function readFbBalance(walletAddress) {
  const web3 = getWeb3();
  const owner = new web3.PublicKey(walletAddress.trim());

  const endpoints = [RPC_ENDPOINT, ...RPC_FALLBACKS];
  const failures = [];

  for (const endpoint of endpoints) {
    try {
      const total = await tryEndpoint(endpoint, owner);
      return { balance: total, address: walletAddress.trim(), endpoint };
    } catch (err) {
      const host = new URL(endpoint).host;
      failures.push(`${host}: ${err.message}`);
      console.warn('[wallet] endpoint failed', host, err.message);
    }
  }

  throw new Error(`all RPCs failed — ${failures.join(' | ')}`);
}
