import { FB_MINT, RPC_ENDPOINT } from './constants.js';

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

let sharedConnection = null;
function connection() {
  if (!sharedConnection) {
    const web3 = getWeb3();
    sharedConnection = new web3.Connection(RPC_ENDPOINT, 'confirmed');
  }
  return sharedConnection;
}

async function readFromProgram(owner, programIdStr) {
  const web3 = getWeb3();
  const programId = new web3.PublicKey(programIdStr);
  const conn = connection();
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

export async function readFbBalance(walletAddress) {
  const web3 = getWeb3();
  const owner = new web3.PublicKey(walletAddress.trim());

  const results = await Promise.allSettled([
    readFromProgram(owner, SPL_TOKEN_PROGRAM_ID),
    readFromProgram(owner, TOKEN_2022_PROGRAM_ID),
  ]);

  let total = 0;
  let anySucceeded = false;
  for (const r of results) {
    if (r.status === 'fulfilled') {
      anySucceeded = true;
      total += r.value;
    } else {
      console.warn('[wallet] program query failed', r.reason?.message ?? r.reason);
    }
  }

  if (!anySucceeded) {
    throw new Error('all token program queries failed');
  }

  return { balance: total, address: walletAddress.trim() };
}
