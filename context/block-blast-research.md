# Block Blast Mechanics Reference

## Purpose of this document
Babie Blast borrows Block Blast's **gameplay grammar** (grid, tray, shape catalog, clearing rules, scoring) as the underlying puzzle system on top of which the $FB token-promotion layer is built. This document captures the researched mechanics of the original Block Blast (Hungry Studio, 2022+) so implementation decisions in Babie Blast stay authentic to the loop that players already know — while the aesthetic, chaos layer, and token gate remain original.

**Babie Blast ≠ Block Blast.** Different product, different goal (token promotion), different visual style (slum / toxic neon), different features (Alley Events, Frog Rocket revive, $FB gate). We inherit the *feel* of block placement, not the brand.

---

## 1. Core Board
| Property | Value | Notes |
| :--- | :--- | :--- |
| Grid | 8×8 (64 cells) | Confirmed via App Store copy and majority of guides. |
| Piece tray | 3 pieces at a time | All 3 must be placed before a new set is drawn. |
| Rotation | **None** | Every rotational variant is a distinct catalog entry. |
| Colors | Cosmetic only | No matching-color mechanic; palette rotates with theme. |

## 2. Shape Catalog (~19 fixed-orientation polyominoes)
No developer-published enumeration; community count is ~19. Confirmed families:

- **Monomino**: 1×1
- **Dominoes**: 1×2 horizontal, 2×1 vertical
- **Trominoes**: 1×3 / 3×1 bars; L-trominoes (2×2 minus corner) in 4 fixed rotations
- **Tetrominoes**: 7 classic Tetris shapes (I, O, T, S, Z, J, L), each in the game's chosen orientation
- **Long bars**: 1×4 / 4×1, 1×5 / 5×1
- **Squares**: 2×2, 3×3
- **Pentomino family**: L-pentominoes (2×3 minus corner), T-pentominoes, small diagonals/staircases

**Implication for Babie Blast**: hand-author the catalog as fixed shapes — do not build a rotation system.

## 3. Line Clearing
- Full row of 8 clears; full column of 8 clears.
- **No 3×3 sub-square clears** (that's Sudoku Block Puzzle, a different game).
- One placement can trigger multiple simultaneous row + column clears.

## 4. Scoring System

### Base placement
- **1 point per placed cell.** (3×3 = 9 pts, 1×1 = 1 pt.)

### Line clears
- **~10 points per cleared cell.** A full row clear ≈ 80 pts.

### Multi-line bonus (same drop)
Additional flat bonus stacked on top of per-cell clear points:
| Lines cleared simultaneously | Bonus |
| :--- | :--- |
| 2 | ~+30 |
| 3–4 | escalating |
| 5 | +200 |
| 6+ | +300 (cap) |
| Full board clear | +360 |

### Streak multiplier (consecutive drops)
- Clearing at least one line on a placement builds a streak counter that multiplies future clears.
- Placing without clearing **resets** the streak.
- Android rule: at least one clear per tray-of-3. iOS rule: one clear per 3 placements. **Babie Blast should adopt the iOS rule** — more forgiving, better for casual Telegram audience.

## 5. Game Loop
- **Game over**: none of the 3 currently-offered pieces fits anywhere on the board. Board-blind piece generation → unwinnable states are legal and common.
- **Endless.** No timer, no lives, no move counter in Classic mode.
- **No native global leaderboard** in the original — share-a-screenshot only. Babie Blast should ship its own Telegram Cloud Storage-backed leaderboard.

## 6. Piece Generation
- Random draw from the shape pool.
- **No 7-bag equivalent.** No solvability check.
- Adaptive-difficulty weighting is community-disputed, undocumented. Safe default: pure random with a slight bias toward smaller shapes early game.

## 7. Boosters (original catalog)
| Booster | Effect |
| :--- | :--- |
| Bomb | Clears 3×3 area around tapped cell |
| Hammer | Removes a single cell |
| Line clearer | Wipes one row or column |
| Revive | Ad-gated or coin-paid; partially clears board on game-over |

**Babie Blast mapping**: Frog Rocket is our token-gated equivalent of the Line clearer / board-wipe booster. Behind $FB ≥ 500 gate rather than ads/IAP.

---

## What Babie Blast keeps, borrows, or invents

| System | Origin | Notes |
| :--- | :--- | :--- |
| 8×8 grid | Borrowed | Direct lift. |
| 3-piece tray | Borrowed | Direct lift. |
| Fixed-orientation shape catalog | Borrowed | Rebuild ~19 shapes; no rotation. |
| Row/column clearing | Borrowed | Direct lift. |
| Scoring formula + streak | Borrowed | iOS-style streak rule. |
| Random piece generation | Borrowed | Pure random, no bag. |
| Booster archetype | Borrowed | Frog Rocket = line/board clearer. |
| **Alley Events** | **Original** | Chaos layer triggered every 500 pts. Not from Block Blast. |
| **$FB token gate** | **Original** | 500 $FB unlocks Frog Rocket revive + premium features. |
| **Solana wallet read** | **Original** | Read-only RPC balance check. |
| **Slum / toxic neon aesthetic** | **Original** | Distinct visual identity. |
| **pump.fun deep-link buy portal** | **Original** | Failure state monetization loop. |

---

## Sources
- [Block Blast App Store listing (US)](https://apps.apple.com/us/app/block-blast/id1617391485)
- [Hungry Studio official site](https://www.hungrystudio.com/)
- [Block Blast official website](https://www.blockblast.com/)
- [LevelWalks — Tips and Strategies](https://levelwalks.com/blog/block-blast-tips-strategies)
- [OnlineBlockBlastSolver — Score Rules](https://onlineblockblastsolver.com/block-blast-score-rules/)
- [BlockPuzzleSolver — Scoring System](https://blockpuzzlesolver.com/scoring/)
- [Playgama — Algorithm FAQ](https://playgama.com/blog/game-faqs/how-does-the-block-blast-algorithm-function/)
- [Playgama — Shape guide](https://playgama.com/blog/game-faqs/how-many-blocks-are-there-in-block-blast/)
- [Playgama — Solvability](https://playgama.com/blog/game-faqs/why-does-block-blast-sometimes-have-no-solution/)
- [Playgama — Power-ups](https://playgama.com/blog/game-faqs/what-are-power-ups-in-block-blast-game/)
- [Blast-Block — Power-ups Guide](https://blast-block.github.io/blog/block-blast-power-ups-guide.html)
