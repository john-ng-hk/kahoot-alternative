# End game sessions and game visuals: design

Date: 2026-11-27. Status: waiting for approval. Size: small to medium, one change set, no migration.

## Intent

1. The host has no way to end a game or find an old one. Add both.
2. The game screens (host and player) look plain. Restyle them with the Ingram Micro brand, in a way that can be swapped for another brand later without touching layout or behaviour.

## Goals

- Host can end a game from the host game screen (lobby or quiz).
- Host can see their unfinished games on the dashboard, resume them or end them.
- One shared visual style across all host and player game screens.
- Rebranding later means editing brand tokens in one place, not screen files.

## Non-goals

- No new game flow, scoring, timing or screen order. No new data shown to players.
- No `ended` phase and no schema change.
- No restyle of the quiz editor or import pages beyond the colour token swap they pick up automatically.
- No new npm packages.
- Not blocking new players from joining an ended game (they see the results screen).

## Constraints

- `phase` stays `lobby | quiz | result` (DB check constraint). RLS already lets the host update their own games.
- Brand rules from the `ingram-micro-brand` skill: blue `#1570ef`, Helvetica Neue / Arial / Inter, WCAG AA, sentence case, no exclamation marks, Hong Kong English, supplied logo files only.
- Answer colours (red, blue, yellow, green) stay as secondary colours for readability.

## Approaches considered

- **End game:** (a) set `phase = 'result'` [chosen]; (b) new `ended` state with a "cancelled" screen. (b) needs a migration, new types and a new player screen, and only helps if cancelled games must show no results. The host confirmed (a).
- **Visuals:** (a) restyle in place with shared tokens and small CSS animation [chosen]; (b) add an animation library. (b) adds a dependency for little gain. The host chose light motion.

## Design

### End game

- Host game page: an **End game** button (secondary style) on the lobby and quiz screens. It asks for confirmation inline (Confirm / Cancel), then updates `games.phase` to `result`. The existing realtime handlers move the host to the results screen and the players to their thanks screen. No change to the player page.
- Dashboard (`/host/dashboard`): new **Active games** section above the quiz sets. Query `games` where `host_user_id` is the signed-in user and `phase != 'result'`, with the quiz name and player count, newest first. Each row has **Resume** (opens `/host/game/[id]` in a new tab) and **End** (same confirmation, then removes the row). The section is hidden when empty.
- Failure: show the error in the existing `Notice` and leave the game unchanged.

### Visuals

- **Tokens:** brand colours and font stack become CSS variables in `globals.css` `:root`, mapped into `tailwind.config.ts` (`brand`, `brand-dark`, `brand-light`). The violet `accent` is replaced by the brand tokens. Logo and product name live in one small component, so a rebrand changes tokens plus that component.
- **Host screens:** lobby (larger player chips, QR card, logo), question (larger question card, letter badges on answers, styled timer and answer counter), reveal (clearer bar chart with the correct answer marked and the others dimmed), scoreboard and results (podium for the top 3, list below).
- **Player screens:** join card, waiting state, answer buttons, correct / incorrect feedback, thanks screen.
- **Motion:** CSS only. Answer choices fade in, bars grow, correct / incorrect icon pops, waiting indicator pulses. All wrapped in `prefers-reduced-motion` handling.

## Left to the builder

- Exact spacing, sizes and gradients, within the brand rules.
- Whether the logo appears on host lobby and player join only (my proposal) or on more screens.
- Component split for the Active games section.

## Verification

- `npm run lint`, `npm run build`, existing `node:test` tests still pass.
- Run the app against local Supabase and check each screen at host (desktop) and player (phone) widths, including End game from lobby, from a question, and from the dashboard.
