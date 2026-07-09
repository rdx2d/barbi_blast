# Barbi Blast � Project Overview

## Overview
Barbi Blast is a Telegram Mini App puzzle game whose **primary purpose is to promote the $FB token on Solana (listed on pump.fun)** by giving holders premium in-game features they can't access otherwise. The puzzle is the delivery vehicle for token promotion — not a competing entry in the puzzle-game market.

The **gameplay grammar is borrowed** from the popular Block Blast mobile game (Hungry Studio) — 8×8 grid, 3-piece tray of fixed-orientation polyominoes, row/column clearing, streak-based scoring — because that loop is already familiar to tens of millions of mobile players. Everything **above the gameplay layer is original to Barbi Blast**: the slum / toxic-neon aesthetic, the "Alley Events" chaos system, the "Frog Rocket" token-gated revive, and the $FB balance gate. See `block-blast-research.md` for the borrowed mechanics reference.

**Access model (v2, 2026-07-04):** the wallet check is now the FIRST screen. Non-holders can't reach the game at all. To enter, a user must connect a Solana wallet holding at least **1,200,000 $FB** (~$3 at time of writing). Verified holders get the full loop, including the free Frog Rocket revive on game-over (double-gating them would feel bad). Non-holders see the gate screen with a one-tap BUY $FB button that deep-links to pump.fun. The verified address is cached in localStorage and silently re-verified against RPC on each session so that sellers lose access on next reload.

## Goals
1. **Promote $FB and drive purchase volume on pump.fun** — the entire product exists to funnel players toward buying $FB. Every gameplay failure state and premium-feature lock is a marketing surface for the token.
2. Deliver a highly responsive, non-glitchy HTML5 8×8 puzzle engine playable natively inside Telegram, faithful enough to Block Blast's grammar that the loop feels familiar within seconds.
3. Implement a zero-friction, read-only Solana wallet balance verification check using free RPC layers — never request signing, never touch private keys.

## Core User Flow (v2 — 2026-07-04)
1. User launches `@BarbiBlastBot` inside Telegram.
2. **Gate screen appears immediately** with the Barbi backdrop and music. First-time users paste their Solana address; returning users are silently re-verified from cache.
3. RPC read confirms balance ≥ 1,200,000 $FB → gate dismisses → game boots.
4. Non-holders see the gate reject state with a one-tap BUY $FB deep-link to pump.fun.
5. Verified holders play the full loop; on game-over, Frog Rocket revive is free.
6. If a verified holder sells their $FB, the next session's silent re-verify will fail and they'll see the gate again.

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
- **Holder threshold**: 1,200,000 $FB (~$3 USD at launch).
- Deep-linked "Buy $FB" portal on the gate screen for non-holders and any failure state.
- Verified addresses cached in localStorage; re-verified against RPC each session.
- **Dev mock wallet**: outside Telegram (or with `?mock=1`), a dev UI simulates holder / non-holder states for local browser testing without touching an RPC.

### Token-Gated Access (v2 — the promotion mechanism)
- **Whole-app gate**: no holdings, no game. Gate screen is the first thing every user sees.
- **Threshold**: 1,200,000 $FB (~$3).
- Verified holders enjoy the full loop including free Frog Rocket revive (double-gating them would feel bad).
- Non-holders see a one-tap BUY $FB deep-link to pump.fun.

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
