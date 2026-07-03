# UI Context

## Theme
A dark, atmospheric underground aesthetic that contrasts clean, plastic doll elements against a gritty slum alley backdrop, highlighted with toxic neon colors.

## Colors
All components must map cleanly to these primary color tokens:

| Role | CSS Variable | Value |
| :--- | :--- | :--- |
| **Page background** | --bg-base | #1E1E24 (Asphalt Charcoal) |
| **Surface/Grid** | --bg-surface | #3D3A3E (Industrial Iron Gray) |
| **Primary text** | --text-primary | #FFFFFF (Pure White) |
| **Muted text** | --text-muted | #A0A0A5 (Grit Smoke) |
| **Primary accent** | --accent-primary | #39FF14 (Toxic Neon Slime Green) |
| **Web3 Action** | --accent-solana | #9945FF (Solana Purple) |
| **Success Alert** | --state-success | #14F195 (Solana Teal) |

## Typography
- **UI Fonts / Numbers**: Custom bolded monospace layout for pixelized game metrics.
- **Variables**: --font-mono mapped to standard browser-safe retro fonts.

## Layout Patterns
- **Canvas Container**: Centered 9:16 mobile-first viewport optimized to run seamlessly inside the standard Telegram WebApp pop-up context.
- **Wallet Modal Overlay**: Centered, blurred backdrop showing the blonde character model backdrop when verification is active.
