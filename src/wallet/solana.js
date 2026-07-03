import { FB_MINT, RPC_ENDPOINT } from './constants.js';

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

export async function readFbBalance(walletAddress) {
  const web3 = getWeb3();
  const owner = new web3.PublicKey(walletAddress.trim());
  const mint = new web3.PublicKey(FB_MINT);
  const conn = connection();

  let total = 0;

  try {
    const res = await conn.getParsedTokenAccountsByOwner(owner, { mint });
    for (const acc of res.value) {
      const info = acc.account?.data?.parsed?.info?.tokenAmount;
      if (info && typeof info.uiAmount === 'number') {
        total += info.uiAmount;
      }
    }
  } catch (err) {
    console.warn('[wallet] SPL Token query failed', err.message);
  }

  if (total === 0) {
    try {
      const programId = new web3.PublicKey(TOKEN_2022_PROGRAM_ID);
      const res = await conn.getParsedTokenAccountsByOwner(owner, { programId });
      for (const acc of res.value) {
        const info = acc.account?.data?.parsed?.info;
        if (info?.mint === FB_MINT) {
          const uiAmount = info.tokenAmount?.uiAmount;
          if (typeof uiAmount === 'number') total += uiAmount;
        }
      }
    } catch (err) {
      console.warn('[wallet] Token-2022 query failed', err.message);
    }
  }

  return { balance: total, address: walletAddress.trim() };
}
