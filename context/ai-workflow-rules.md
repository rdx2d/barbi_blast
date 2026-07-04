# AI Workflow Rules

## Approach
Build Barbi Blast incrementally using a strict, spec-driven workflow. The context files define what to build, how to build it, and the current state of progress. Always implement against these specs � do not infer or invent behavior from scratch.

## Scoping Rules
- Work on one feature unit at a time.
- Prefer small, verifiable increments over large speculative code changes.
- Do not combine unrelated system boundaries in a single implementation step.

## When to Split Work
Split an implementation step if it combines:
- Canvas UI adjustments and async Web3 Solana balance calls.
- Game grid loop updates and global leaderboards.
- Behavior not explicitly verified in the spec folder.

## Handling Missing Requirements
- Do not invent game mechanics or product rules not defined in the context files.
- If a requirement is ambiguous, resolve it with the user before implementing.
- Add any new unresolved item into the open questions section of progress-tracker.md.

## Protected Files
Do not modify core configuration assets, mainnet mint constants, or public node settings unless explicitly instructed by the user.

## Keeping Docs in Sync
Update the relevant context file whenever implementation changes:
- System design boundaries or grid sizes.
- RPC node query endpoints.
- Scoring event parameters.

## Before Moving to the Next Unit
1. The current feature unit must work flawlessly end-to-end within Telegram.
2. No invariant defined in rchitecture.md was violated.
3. progress-tracker.md is updated to reflect the reality of the codebase.
