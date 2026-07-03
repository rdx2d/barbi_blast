# Architecture Context

## Stack
| Layer | Technology | Role |
| :--- | :--- | :--- |
| **Framework** | Vanilla HTML5 / JavaScript (Phaser 3 Engine) | Zero-overhead frontend canvas architecture running natively in Telegram WebViews. |
| **Hosting** | Vercel (Free Tier) | Edge-network hosting of game assets and static code with automated HTTPS handling. |
| **Blockchain**| @solana/web3.js + Helius/QuickNode RPC | Standard clients reading SPL Token accounts directly from the mainnet ledger. |

## System Boundaries
- src/game/ — Handles the grid layout array, asset rendering, drag-and-drop tracking, and line clear logic.
- src/wallet/ — Contains pure cryptographic balance verification logic. It never mutates chain state or stores private keys.

## Storage Model
- **Blockchain Data**: The absolute truth of user token balances, queried on-demand via RPC methods.
- **Telegram Cloud Storage**: Temporary caching of session scores and high-water marks linked to unique Telegram user IDs.

## Auth and Access Model
- Public verification utilizes Web3 public keys. The client fetches the Associated Token Account (ATA) for the $FB mint address.
- Premium features are enabled strictly if: $Balance_{User} \ge 500 $FB.

## Invariants
1. **No Blocking Operations**: Balance checks must run asynchronously; the canvas frame rate must never drop below 60fps during network requests.
2. **Read-Only Ledger Footprint**: The application must never request private key access or ask for transaction signing permissions.
3. **Deterministic Board States**: The 8x8 grid matrix array must be completely evaluated for valid placement moves after every drop to prevent game loop lockups.
4. **No External UI Framework Overlap**: All animations and positioning maps must adapt natively inside the canvas viewport without introducing bloated HTML runtime layers.
