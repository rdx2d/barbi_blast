# Code Standards

## General
- Keep modules small, highly single-purpose, and modular.
- Fix root performance bugs instantly; do not layer dirty workarounds over the layout array calculations.
- Do not mix rendering/Phaser canvas drawing structures with pure crypto balance business logic.

## JavaScript / TypeScript
- Strict type definitions or highly sanitized objects are required throughout the game states.
- Avoid loose ny variables—define structured game data formats explicitly.
- Validate incoming numbers from the Solana RPC layer safely to prevent integer overflow exploits in client-side high score variables.

## Game Engine Conventions
- Isolate the 8x8 matrix evaluation system into standard pure functions (grid.js).
- Render custom block textures dynamically out of clean image assets (e.g., using asset elements from 226211.png).
- Manage input states smoothly—disable drag events completely when game animations are rendering to avoid state inconsistencies.

## Styling & Assets
- Use hex values strictly matching the tokens inside ui-context.md.
- Scale graphics responsively using native aspect ratio multipliers inside the Canvas sizing methods.
