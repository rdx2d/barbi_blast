# Barbi Blast � Project Overview

## Overview
Barbi Blast is a Telegram Mini App puzzle game whose **primary purpose is to promote the $FB token on Solana (listed on pump.fun)** by giving holders premium in-game features they can't access otherwise. The puzzle is the delivery vehicle for token promotion — not a competing entry in the puzzle-game market.

The **gameplay grammar is borrowed** from the popular Block Blast mobile game (Hungry Studio) — 8×8 grid, 3-piece tray of fixed-orientation polyominoes, row/column clearing, streak-based scoring — because that loop is already familiar to tens of millions of mobile players. Everything **above the gameplay layer is original to Barbi Blast**: the slum / toxic-neon aesthetic, the "Alley Events" chaos system, the "Frog Rocket" token-gated revive, and the $FB balance gate. See `block-blast-research.md` for the borrowed mechanics reference.

Players who don't hold enough $FB experience a deliberately truncated version of the game — Alley Events still fire, but the Frog Rocket revive and competitive leaderboard tiers are locked. Failure states deep-link to pump.fun to buy $FB, closing the promotion loop.

## Goals
1. **Promote $FB and drive purchase volume on pump.fun** — the entire product exists to funnel players toward buying $FB. Every gameplay failure state and premium-feature lock is a marketing surface for the token.
2. Deliver a highly responsive, non-glitchy HTML5 8×8 puzzle engine playable natively inside Telegram, faithful enough to Block Blast's grammar that the loop feels familiar within seconds.
3. Implement a zero-friction, read-only Solana wallet balance verification check using free RPC layers — never request signing, never touch private keys.

## Core User Flow
1. User launches the `@BarbiBlastBot` inside Telegram.
2. User plays the base game to experience the addictive loop (dragging blocks, clearing rows).
3. User runs out of moves (Game Over) or tries to enter the Daily Tournament.
4. Game prompts wallet connection to check $FB token balance.
5. If token criteria are met ($Balance \ge 500 $FB), the player triggers a "Frog Rocket" board clear to continue or unlocks premium features; otherwise, they are redirected to a direct buy link on pump.fun.

## Features

### Core Gameplay Engine (borrowed grammar — see `block-blast-research.md`)
- 8×8 grid, 3-piece tray, fixed-orientation shape catalog (~19 polyominoes, no rotation).
- Drag-and-drop block placement.
- Row and column clearing (no 3×3 sub-square clears).
- Scoring: 1 pt per placed cell + ~10 pt per cleared cell + multi-line simultaneous bonus (cap +300 for 6+ lines, +360 full-board clear).
- Streak multiplier: iOS-style rule — clear at least one line every 3 placements to keep the streak alive.
- Piece generation: pure random from catalog, no bag, no solvability guarantee (matches original).

### Slum Chaos System (original — Barbi Blast's differentiator)
- **Alley Events**: triggered every 500 points to alter the board mid-run (e.g., placing un-clearable trash pieces or fire zones). Not present in Block Blast.
- **Frog Rocket revive**: token-gated clutch mechanism triggering a board-wipe on game-over. Behind $FB ≥ 500 gate. Replaces the ad-gated / IAP revive in the original.

### Solana Web3 Verification (original)
- Read-only RPC check for the $FB token Associated Token Account (ATA).
- **$FB mint address**: `J1tvQ5QLa8pupPAKSdQXdru6T4uoCFrRSUNkdsbApump` (Solana, pump.fun).
- Deep-linked "Buy $FB" portal targeting pump.fun, surfaced on every failure state a non-holder hits.
- **Dev mock wallet**: outside Telegram (or with `?mock=1`), a dev UI simulates holder / non-holder states for local browser testing without touching an RPC.

### Token-Gated Premium Layer (original — the promotion mechanism)
- Frog Rocket revive: locked below 500 $FB.
- Tournament / high-tier leaderboard access: locked below 500 $FB.
- Non-holders play a truncated version and are funneled to pump.fun; holders get the full loop.

## Scope
### In Scope
- Single-player interactive puzzle canvas module.
- Client-side Solana wallet integration (Phantom/Telegram Wallet linking via deep links).
- Localized high-score tracker using Telegram Cloud Storage / lightweight free backend.

### Out of Scope
- Native iOS or Android binary builds (strictly a Telegram Mini App wrapper).
- Writing transaction signing capability (the game only *reads* data, ensuring maximum security and budget optimization).

## Success Criteria
1. A user can launch the game in under 3 seconds inside Telegram on iOS, Android, or Desktop.
2. The wallet balance check instantly recognizes a balance ≥ 500 $FB tokens and safely transitions the loop state into Premium Mode.
3. Every game-over state for a non-holder surfaces a one-tap pump.fun deep link — the funnel is never more than one action away from a $FB purchase.
4. The gameplay loop feels immediately familiar to anyone who has played Block Blast — piece behavior, clearing, scoring, and streak all match the borrowed grammar.
