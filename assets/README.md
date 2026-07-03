# Assets

## Sources

### Blocks (`assets/blocks/`)
- **Origin**: Kenney Puzzle Pack (75 assets)
- **Official page**: https://kenney.nl/assets/puzzle-pack
- **Mirror used for automated fetch**: https://github.com/iwenzhou/kenney (`Art (5190 files)/Puzzle assets (80 assets)/PNG`)
- **License**: CC0 1.0 Universal (Public Domain). No attribution required, but credited here for good faith.
- **Files pulled**:
  - `element_green_square_glossy.png`
  - `element_purple_cube_glossy.png` (purple glossy square; the "cube" name is Kenney's, geometry is a square gem)
  - `element_purple_square.png` (flat purple square)
  - `element_grey_square_glossy.png`
  - `element_blue_square_glossy.png`
  - `element_red_square_glossy.png`
  - `element_yellow_square_glossy.png`

All sprites are 32x32 RGBA PNGs.

## Runtime Tinting Note
The Kenney palette does not exactly match the toxic-neon tokens in `context/ui-context.md`
(`--accent-primary #39FF14`, `--accent-solana #9945FF`). Phaser's `setTint()` will be
applied at render time to shift the glossy sprites toward the target neon range while
preserving their highlight/shadow modeling — cheaper than commissioning custom art and
avoids the flat "AI slop" look of hand-drawn `fillRect` primitives.

## Fonts
Loaded via Google Fonts CDN in `index.html`:
- **Press Start 2P** — retro 8-bit arcade display type (used for the title / big HUD numbers)
- **VT323** — CRT-terminal monospace (used for body labels and score counters)

---

## Project-owned media (`assets/img/`, `assets/media/`)

Source: the `$FB` (Fentanyl Barbi Solana) token's X/Twitter media, provided by the project owner. Rights: owned by the token project.

### Images
- **`img/fentanyl-barbi.webp`** (661 KB, lossless WebP)
  - Currently: darkened, cool-tinted (`0x8fa8ff`), alpha 0.42, scaled to cover the 720×1280 virtual canvas, painted as the first backdrop layer beneath the vignette + scanlines + noise.
  - Purpose: gives the board a coherent "slum-alley Barbi" identity without the game canvas needing HTML overlays.
  - Perf: single image, decoded once by Phaser, GPU-cached. No runtime cost after `create()`.

### Videos (staged for later units — NOT yet playing)
- **`media/barbi-money.mp4`** (2.9 MB) — staged for the game-over / "Buy $FB" screen. Highest funnel signal: character holding cash.
- Additional videos still in `/stuff/` (not copied yet):
  - `Barbi - Pipe.mp4` (2.4 MB) — candidate for Alley Event "Trash / smoke" chaos trigger
  - `Barbi and WALPHA bulls.mp4` (2.0 MB) — candidate for high-score / streak celebration
  - `Barbi surrounded by WALPHA.mp4` (2.7 MB) — candidate for premium-tier unlock reveal
  - `Barbi with WALPHA.mp4` (2.3 MB) — candidate for splash / attract loop

### Performance guardrails for video (enforced when we wire them in)
1. **Never play video during active gameplay.** Canvas frame rate is the priority. Videos are reserved for menu, splash, game-over, and premium reveal — not the play loop.
2. `<video muted autoplay loop playsinline preload="metadata">` — never full-preload, never with audio (autoplay policies + battery).
3. At most **one video element alive at a time**. Detach + garbage-collect when the state exits.
4. Lazy-load: don't fetch the file until the state that needs it is imminent (e.g., load the money video when the score crosses a "danger" threshold, not on boot).
5. Serve via same-origin (Vercel edge) so the CDN handles range requests + caching. No HLS, no manifest overhead.
6. On slow connections (`navigator.connection.effectiveType === 'slow-2g' | '2g'`), fall back to a still poster frame instead of the video.
