# Progress Tracker

## Current Phase
- Unit 07 complete (home screen + navigation + skins + leaderboard UI). All seven persistence/leaderboard deliverables shipped and reachable from the UI. App flow: gate → HOME → PLAY ⇄ game.

## Current Goal
- Stabilize + user QA of the full flow in Telegram. Backlog candidates next: Alley Event variants (Fire Zone, Alley Rats), achievements to back the MEDALS surface, real "MORE SETTINGS" content.

## Completed
- **Unit 01**: Base 8x8 matrix implementation and canvas rendering.
  - `index.html` shell loads Phaser 3.80.1, Telegram WebApp SDK, and Google Fonts (Press Start 2P + VT323).
  - `styles/tokens.css` exposes color/font tokens from `ui-context.md` (`--font-arcade`, `--font-mono`).
  - `src/game/grid.js` — pure module: `GRID_SIZE`, `CELL_STATE`, `createEmptyGrid()`, `isInBounds()`, `getCell()`.
  - `src/game/main.js` — Phaser scene, boots after `document.fonts.load` so first paint has correct typography.
- **Unit 01 polish pass**:
  - Real asset pipeline: Kenney Puzzle Pack (CC0) sprites in `assets/blocks/`, sourced via `iwenzhou/kenney` GitHub mirror. Preloaded in scene; not yet rendered (reserved for Unit 02).
  - Backdrop: radial vignette + CRT-style horizontal scanlines + procedural noise dither.
  - Title: `Press Start 2P` "BARBI BLAST" with neon-green glow FX + drop shadow + dark stroke; `VT323` subtitle "// SLUM ALLEY BLOCKS //".
  - Board: shadowed rounded frame, neon accent border with `postFX.addGlow`, inner bevel, 8x8 cells with dark fill + subtle highlight strip (glossy hint).
  - Footer: "HOLD $FB • UNLOCK FROG ROCKET" in Solana purple, threshold hint in muted VT323.
  - Project backdrop: Fentanyl Barbi WebP layered under vignette at alpha 0.42 + cool blue tint so the toxic board stays legible.
- **Unit 02**: Piece pool, tray, drag-and-drop, placement.
  - `src/game/shapes.js` — 27-entry catalog covering monomino, dominoes, trominoes (bars + 4 L-trominoes), tetrominoes (7 Tetris shapes in fixed orientations), 1×4/1×5 bars, 2×2 and 3×3 squares. Tier-weighted RNG biases small pieces early (tier 1: weight 4 → tier 4: weight 1). No rotation.
  - `src/game/placement.js` — pure `canPlace`, `applyPlacement` (returns fresh grid), `hasAnyValidPlacement`.
  - Tray: 3 slots below the board at 55% cell size; each piece rendered as a Phaser Container of Kenney glossy sprites.
  - Drag: on `dragstart` piece scales up to full board cell size; follows pointer with a thumb-clearance offset; ghost overlay highlights target cells green (valid) or red (invalid); invalid drop tweens back to home slot; valid drop commits to grid, spawns filled sprites at each cell, destroys tray container.
  - Refill: when all 3 tray pieces placed, new tray auto-spawns.
  - Dim state: each frame after a placement, tray pieces that have no valid placement fade to alpha 0.35 (game-over telegraph). All-3-unplayable emits a console warning (full game-over UI is a later unit).
- **Unit 03**: Line clearing + scoring + streak + HUD.
  - `src/game/clearing.js` — pure `findClears`, `clearedCellSet`, `applyClears`, `isFullBoardClear`.
  - `src/game/scoring.js` — pure Block Blast formula: 1 pt/placed cell + 10 pt/cleared cell, multi-line bonus (2:+30, 3:+80, 4:+130, 5:+200, 6+:+300 cap), full-board-clear override +360. Streak multipliers `[1.0, 1.2, 1.5, 2.0, 2.5]` cap at 2.5×; applied to clear+bonus only, not placement drip. `advanceStreak` runs the iOS-style rule (clear at least once every 3 placements).
  - HUD strip above the board: SCORE (Press Start 2P 26px neon-green), HIGH (18px white, right), STREAK indicator (VT323 22px green) shows current multiplier when active.
  - Placement flow: place → detect clears → flash-and-fade cleared sprites (white tint, scale +30%, alpha to 0 over 260ms) → apply clear to grid → score → advance streak → animate "+N" pop above drop location → banner for combos ("DOUBLE!", "3X COMBO!", "FULL CLEAR!") with glow FX → refresh HUD → tray refill + dim check.
- **Unit 04**: Alley Events (Trash Drop MVP) — Barbi Blast's original chaos layer.
  - `src/game/grid.js` — extended `CELL_STATE` with `HAZARD=2`. Existing `canPlace` blocks placement on hazards (any non-EMPTY cell is blocked); existing `findClears` naturally skips rows/cols containing hazards (a row is only "full" when every cell is FILLED, not HAZARD).
  - `src/game/alleyEvents.js` — pure module: `ALLEY_EVENT_INTERVAL=500`, `eventsDueAfterScoreCross(prev,next)`, `pickEvent`, `runEvent` dispatcher, `runTrashDrop(grid,{minCount:2,maxCount:3,rng})` returns fresh grid + placed cell list.
  - Trigger: `maybeFireAlleyEvent(prevScore)` at the end of `commitPlacement`. Uses score-boundary crossing so a single big combo that leaps two intervals fires both events in sequence.
  - FX: 240ms camera shake (intensity 0.008), toxic-green full-canvas flash overlay, red `!! TRASH DROP !!` banner in Press Start 2P with red glow + VT323 subtitle "the alley leaves its garbage behind", hazard cells scale-in with bounce and slight rotation stagger.
  - Hazard rendering: Kenney grey glossy square with `0x3a3a3a` dark tint, yellow diagonal hazard-stripe overlay (Graphics), and a thin yellow border. Instantly readable as "obstacle".
  - Design intent: hazards CAN kill runs — if adding 2-3 trash cells makes all 3 tray pieces unplayable, that's a legitimate game-over. The chaos is the differentiator.
- **Unit 05b**: Real Solana RPC balance reader + manual paste connect flow.
  - `src/wallet/constants.js` — extracted `FB_MINT`, `HOLDER_THRESHOLD`, `PUMP_FUN_URL` (fixed to `pump.fun/coin/{MINT}` per pump.fun's real URL scheme), `RPC_ENDPOINT` = `https://api.mainnet-beta.solana.com`.
  - `src/wallet/solana.js` — uses `window.solanaWeb3` from `@solana/web3.js@1` IIFE bundle loaded via jsdelivr. `isValidSolanaAddress` (length + base58 + on-curve check), `readFbBalance(address)` → queries SPL Token accounts filtered by `FB_MINT`, falls back to Token-2022 program if empty. Returns `{ balance, address }`.
  - `src/wallet/index.js` — now routes: mock in `?mock=1` or non-Telegram browser, real otherwise. Added `connectWithAddress(addr)` that validates and reads balance. Result is cached until `disconnectWallet()` clears it. Errors surface in the returned state as `error` field.
  - `src/ui/gameOverModal.js` — state machine with 5 modes (DISCONNECTED → AWAITING_ADDRESS → CHECKING → HOLDER / NON_HOLDER). In real mode, first CONNECT click reveals the address input and switches primary to VERIFY BALANCE; Enter or click validates. Balance is human-formatted (`1.2K`, `4.5M`). Error state offers RETRY.
  - `index.html` — loaded `@solana/web3.js@1` before the module script. Modal HTML gained the input field + error slot.
  - `styles/tokens.css` — input field styled with neon-green focus ring matching the theme.
  - `index.html` — modal shell as HTML overlay (outside Phaser canvas): looping `barbi-money.mp4` background with `muted playsinline preload="metadata"` per perf guardrails, GAME OVER title, score/high stats, wallet status line, primary action button, PLAY AGAIN secondary, mock-mode debug section.
  - `styles/tokens.css` — modal styles with backdrop blur, radial-scrim over video for legibility, neon-green primary button, Solana-purple `.buy` variant, fade-in transition.
  - `src/wallet/mockWallet.js` — pure mock state machine: DISCONNECTED / NON_HOLDER (25 $FB) / HOLDER (750 $FB) with `connectMockAsNonHolder`, `toggleMockHolder`, `disconnectMock`.
  - `src/wallet/index.js` — stable public interface: `FB_MINT` constant (`J1tv...pump`), `HOLDER_THRESHOLD=500`, `PUMP_FUN_URL`, `isMockMode()`, async `readWalletState`, `connectWallet`, `toggleMockHolder`, `openBuyLink()` (uses `Telegram.WebApp.openLink` when available, `window.open` fallback). Auto-detects mock mode via `?mock=1` param or absence of Telegram WebApp initData.
  - `src/ui/gameOverModal.js` — DOM controller. Wires primary button to 3 modes: CONNECT WALLET / FROG ROCKET REVIVE (holder) / BUY $FB ON PUMP.FUN (non-holder, opens `pump.fun/{MINT}` in new tab). PLAY AGAIN always available. Mock toggle button visible in mock mode.
  - Scene wiring: `triggerGameOver()` fires when no tray piece has any valid placement; disables drag input via `this.gameOver` flag; opens modal after a 320ms grace beat.
  - `frogRocketRevive()`: radial-fling explosion of all board sprites (cells + hazards), 480ms camera shake, toxic-green full-canvas flash, big Solana-teal "FROG ROCKET" banner with glow FX, "BOARD WIPED • RUN CONTINUES" subtitle. Score kept, streak reset, fresh tray spawned after 900ms.
  - `hardReset()` (PLAY AGAIN): simpler fade-out, score to 0, streak reset, alleyEventsFired reset, fresh tray after 400ms.

- **Unit 06 (a–d)**: Backend + persistence + leaderboards.
  - `api/` — first server-side component: Vercel functions + Upstash Redis (REST, zero npm deps). `POST /api/submit` validates Telegram initData HMAC (`TELEGRAM_BOT_TOKEN` env), rate-limits 1/5s, updates `player:{tgId}` hash + `lb:global` / `lb:week:{ISO}` ZSETs (GT semantics), returns ranks. `GET /api/leaderboard?scope=global|week` returns top 50 + caller's rank via `X-Telegram-Init-Data` header. Weekly boards expire after 21 days.
  - `src/telegram/identity.js` — user from `initDataUnsafe` (mock fallback under `?mock=1`); `src/net/api.js` — `submitScore`/`fetchLeaderboard` with 5s abort timeout, never throws into game flow.
  - `src/storage/progress.js` — mid-run snapshot (grid/colors/score/streak/alley counter/tray shapeIds), write-through localStorage + Telegram CloudStorage; restore on boot after gate; cleared on game-over so dead boards can't resurrect.
  - HUD shows @username; game-over modal upgrades status line to "ranked global #N • week #N" from the submit response.
  - RPC lesson learned: gate balance reads now walk a failover chain and live on Helius (free key) — every unauthenticated public Solana RPC blocks `getTokenAccountsByOwner`+programId from browsers.
- **Unit 07**: Home screen + navigation + skins + leaderboard UI.
  - Flow inverted: gate → **HOME** (Barbi backdrop, PLAY / LEADERBOARD / BUY $FB, gear top-right) → PLAY lazily constructs Phaser once → in-game gear (replaces old music button) opens settings sheet with GO HOME / CHOOSE SKIN / REPLAY + shared music controls.
  - `src/ui/homeScreen.js`, `src/ui/settingsSheet.js` (one class, home/game modes), `src/ui/skinPicker.js`, `src/ui/leaderboardModal.js`; old `musicControls.js` deleted.
  - `src/game/skins.js` — 3 palette variants (neon default = no-op tint, candy, chrome) via `setTint`; persists `bb.skin`; `bb:skin-changed` event live-retints board/tray/hazards through `BoardScene.retintAll()`.
  - Leaderboard modal: GLOBAL/THIS WEEK tabs, top-50, podium tints, own row highlight + YOU pin. Reachable from Home button and MEDALS in home settings.
  - GO HOME keeps the Phaser scene alive (canvas hidden); PLAY re-reveals it — mid-run state survives via the snapshot system anyway.

## In Progress
- None.

## Next Up
- User QA pass of the full navigation flow in Telegram (gate → home → game → gear menus → skins → leaderboard).

## Backlog
- **Additional Alley Events** (framework in place, add types later):
  - **Fire Zone**: highlights a 2×2 region for 1 tray-cycle; any piece placed there gets its cells locked until the next event.
  - **Alley Rats**: nibbles 4 random cells — inverts filled/empty state.
- **Achievements system** to back the MEDALS surface (currently opens leaderboard).
- **MORE SETTINGS content** (sheet exists as a stub).

## Open Questions
- (none currently open)

## Resolved
- **$FB token mint address**: `J1tvQ5QLa8pupPAKSdQXdru6T4uoCFrRSUNkdsbApump` (Solana, pump.fun). To be wired into `src/wallet/constants.js` when the wallet unit is built. Do not modify without user sign-off (per `code-standards.md`).
- **Mock wallet toggle**: yes — build a dev-only mock wallet UI (visible outside Telegram WebApp context, or gated behind a `?mock=1` URL param) that lets us simulate holder / non-holder states in the browser without touching the RPC or a real Solana connection.
- **Shape catalog**: ship the full ~19 fixed-orientation polyomino set to match the borrowed Block Blast grammar (monomino, dominoes, trominoes, all 7 tetrominoes in fixed orientation, 1×4/1×5 bars, 2×2, 3×3, L/T pentominoes, small staircases). No rotation system. See `block-blast-research.md`.
- **Scoring**: 1 pt/placed cell + 10 pt/cleared cell + multi-line bonus escalating to +300 (6+ lines) or +360 (full board clear).
- **Streak rule**: iOS-style — at least one line clear every 3 placements to keep the streak alive.
- **Piece generation**: pure random, no bag, no solvability check (matches original — unwinnable states are legitimate game-overs).
- **Alley Events**: confirmed original to Barbi Blast, not borrowed. Flagged as differentiator.

## Architecture Decisions
- **Decision**: Game framework selected as pure HTML5 Canvas (Phaser 3 Engine) to satisfy the $0 hosting requirement and avoid server resource consumption during alpha demo launch.
- **Decision**: Token barrier threshold lowered to nothing less than 500 $FB tokens per user requirement context.
- **Decision (Unit 01)**: Plain JavaScript + Phaser via CDN (no build step) to preserve the zero-overhead frontend architecture invariant.
- **Decision (Unit 01)**: Virtual canvas fixed at 720x1280 with `Phaser.Scale.FIT` — guarantees deterministic layout math regardless of device DPR while staying 9:16.
- **Decision (Unit 01 polish)**: Source real CC0 sprites (Kenney Puzzle Pack) instead of hand-rolled `fillRect` primitives, to avoid the "generic AI slop" aesthetic. Pencil MCP was preferred but requires the Pencil app running in VS Code (not currently connected).
- **Decision (Unit 01 polish)**: Typography is `Press Start 2P` (title/HUD) + `VT323` (body/scores) via Google Fonts. Both public, both retro-arcade authentic, both fast to load.

## Session Notes
- Unit 01 shipped end-to-end. Open in a browser at `index.html` (or serve statically) to see the rendered board; no interactivity yet by design.
- **Research pass (2026-07-03)**: verified Block Blast gameplay grammar to make sure we borrow authentically. Full findings in `context/block-blast-research.md`. Reframed `project-overview.md` to make the token-promotion primary goal explicit — Barbi Blast is a $FB utility using borrowed puzzle mechanics, not a puzzle-game competitor.
- **Project media wired (2026-07-03)**: `stuff/` contains the $FB token's X media (1 WebP + 5 MP4s). The Fentanyl Barbi WebP is now the backdrop of the game canvas (darkened + cool-tinted + alpha 0.42, painted before vignette/scanlines). One video (`barbi-money.mp4`) staged in `assets/media/` for the future game-over screen — the other 4 videos remain in `stuff/` with proposed uses catalogued in `assets/README.md`. Performance guardrails documented (no video during gameplay, one video alive at a time, lazy-load, `preload="metadata"`, muted+playsinline).
- **Unit 02 shipped (2026-07-03)**: Piece catalog, tray, drag-and-drop, placement all working. Line clearing is deferred to Unit 03 by design — pieces will accumulate on the board until then. Verified locally before proceeding.
- **Unit 03 shipped (2026-07-03)**: Line clears, scoring, streak, HUD, combo banners all live. High-water mark is session-only for now — persistence will come with the wallet/Telegram Cloud Storage unit. Verification pending user confirmation.
- **Unit 04 shipped (2026-07-03)**: Trash Drop Alley Event fires every 500 points. Hazard cells are un-clearable and un-placeable; if hazards choke the tray into unplayable state, the run legitimately game-overs — that chaos is the design intent. Fire Zone and Alley Rats intentionally deferred to keep the increment small; the dispatcher already supports adding them.
- **Unit 05a shipped (2026-07-03)**: End-to-end token-gated game loop is now playable in mock mode. Game-over triggers a full HTML modal with looping barbi-money.mp4 background, wallet status readout, and three primary states (CONNECT / FROG ROCKET REVIVE / BUY $FB). Frog Rocket wipe is the "wow" moment the whole product exists to deliver. Verified locally in browser — real RPC integration is Unit 05b.
- **Unit 05b shipped (2026-07-03)**: Real Solana mainnet-beta RPC wired in. Manual paste connect flow (per architecture invariant of read-only, no signing). Token program auto-detection tries SPL Token first, falls back to Token-2022. Interface between `src/wallet/index.js` and modal stayed stable; only the modal's connect step needed updating for the two-tap paste/verify UX. Public RPC will need swapping to Helius when player volume grows.
