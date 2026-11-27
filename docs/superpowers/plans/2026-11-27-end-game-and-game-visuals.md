# End game sessions and game visuals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the host end games (from the game screen and from a dashboard list of active games), and restyle all host and player game screens with the Ingram Micro brand through swappable tokens.

**Architecture:** "End" sets `games.phase = 'result'` (no migration); existing realtime handlers move host and players to the results screens. Brand colours, font and logo files sit behind CSS variables, Tailwind theme names and one `BrandLogo` component, so a later rebrand edits tokens and two image files only. Motion is CSS only, behind `motion-safe:`.

**Tech Stack:** Next.js 14 App Router (client components), Tailwind 3, Supabase JS, `node:test` for pure logic.

**Spec:** [docs/superpowers/specs/2026-11-27-end-game-and-game-visuals-design.md](../specs/2026-11-27-end-game-and-game-visuals-design.md)

## Global Constraints

- Do not run `git commit` or `git push`. The user commits. Leave changes in the working tree.
- Keep diffs focused. No change to game flow, scoring, timing, screen order, or data shown to players. No schema change. No new npm packages (`.npmrc` blocks versions under 3 days old anyway).
- `phase` stays `lobby | quiz | result`.
- Brand: primary blue `#1570ef`, hover `#0f5bc4`, on-black link blue `#6aa6f7`, black and white; font stack Helvetica Neue, Helvetica, Arial, Inter; WCAG AA contrast; supplied logo files only, at least 100 px wide, no CSS effects on the logo; no exclamation marks in copy; sentence case; Hong Kong English; no idioms.
- Answer colours (`answer-red/blue/yellow/green`) stay.
- Motion only through `motion-safe:` Tailwind variants. Final state must be fully visible without animation.
- Commands run from the repo root. Test command for pure logic: `cd "src/app/host/game/[id]" && npx --yes tsx --test ./podium.test.ts` (the `[id]` path must be entered with `cd`).

## Review Focus

- RLS denial on `games` update returns zero rows and no error. The End button must show a failure, not close silently (Task 2 test step).
- Resume into a game in `quiz` or `result` phase before `quizSet` has loaded crashes on `quizSet!` in `src/app/host/game/[id]/page.tsx`. Resume makes this path common (Task 2).
- Podium with 0, 1, 2 players, and with ties (for example four players all rank 1). Must not crash or leave empty podium slots (Task 5 tests).
- Longest inputs: 20-character nickname, long question text, 3 choices (odd count, last choice spans two columns). Text wraps, nothing overflows at 375 px player width and 1280 px host width (Task 6 manual check).
- Ending a game with no players: host results screen renders an empty list, player pages unaffected (Task 6 manual check).

## File Structure

- Modify `tailwind.config.ts`, `src/app/globals.css`, `src/app/layout.tsx`, `CLAUDE.md`: brand tokens, motion, font.
- Create `public/brand/logo-on-dark.png`, `public/brand/logo-on-light.png`; replace `src/app/favicon.ico`; create `src/app/apple-icon.png`.
- Create `src/components/brand.tsx`: `BRAND_NAME`, `BrandLogo`.
- Create `src/components/end-game-button.tsx`: confirm-then-end button, used on host game page and dashboard.
- Create `src/app/host/dashboard/active-games.tsx`: active games list.
- Modify `src/app/host/dashboard/page.tsx`, `src/app/host/game/[id]/page.tsx`.
- Create `src/app/host/game/[id]/podium.ts` and `podium.test.ts`.
- Modify host screens `lobby.tsx`, `quiz.tsx`, `results.tsx`, `scoreboard.tsx` (same folder) and player screens `src/app/game/[id]/{page,lobby,quiz}.tsx`.

---

### Task 1: Brand tokens, font, logo, motion

**Files:**
- Modify: `tailwind.config.ts`, `src/app/globals.css`, `src/app/layout.tsx`, `CLAUDE.md`
- Create: `src/components/brand.tsx`, `public/brand/logo-on-dark.png`, `public/brand/logo-on-light.png`, `src/app/apple-icon.png`
- Replace: `src/app/favicon.ico`

**Interfaces:**
- Produces: Tailwind colours `brand` (`DEFAULT`, `dark`, `light`) and `ink`, both supporting opacity modifiers (`bg-brand/20`); animations `animate-fade-up`, `animate-pop`, `animate-grow` (grows from the bottom, `transform-origin: bottom`), `animate-pulse-soft`; `BRAND_NAME: string`; `BrandLogo({ onDark?: boolean, className?: string }): JSX.Element` (default `onDark = true`). The class `accent` no longer exists.

- [ ] **Step 1: Define tokens.** In `globals.css` add a `:root` block with space-separated RGB channels (`--brand-primary: 21 112 239`, `--brand-primary-dark: 15 91 196`, `--brand-primary-light: 106 166 247`, `--brand-ink: 0 0 0`) and `--brand-font` (Helvetica Neue stack ending in `var(--font-inter)`). Map them in `tailwind.config.ts` as `rgb(var(--brand-primary) / <alpha-value>)`. Remove `accent`. Add the four animations in `theme.extend` (`keyframes` plus `animation`), each under 600 ms except `pulse-soft` (infinite).
- [ ] **Step 2: Apply the font.** In `src/app/layout.tsx` load Inter with `variable: '--font-inter'`, put `inter.variable` on `<body>` and set `font-family: var(--brand-font)` on `body` in `globals.css`. Update `metadata.title` only if it needs `BRAND_NAME` (otherwise leave "SupaQuiz").
- [ ] **Step 3: Replace violet.** Rename every `accent` class to `brand` in `src` (grep `accent`: `globals.css`, `host/game/[id]/lobby.tsx`, `sign-in-gate.tsx`, `dashboard/page.tsx`, `quiz-editor.tsx`, `import/page.tsx`). In `.btn-primary` use `hover:bg-brand-dark` instead of `hover:bg-violet-700`. Change `bg-green-600` in `src/app/host/game/[id]/page.tsx` to `bg-ink`.
- [ ] **Step 4: Logo and icons.** Copy `~/.claude/skills/ingram-micro-brand/assets/logos/im-logo-white.png` to `public/brand/logo-on-dark.png` and `im-logo-blue.png` to `public/brand/logo-on-light.png`; copy `assets/icons/favicon.ico` over `src/app/favicon.ico` and `im-icon-180.png` to `src/app/apple-icon.png`. Create `src/components/brand.tsx` with `BRAND_NAME = 'Ingram Micro'` and `BrandLogo` rendering an `<img>` of the matching file, `alt={BRAND_NAME}`, `className` merged with `w-32` as the default width (never below 100 px), no filters.
- [ ] **Step 5: Document.** Add two lines under Architecture in root `CLAUDE.md`: brand tokens live in `globals.css` `:root`, `tailwind.config.ts` and `public/brand/`; rebrand by editing those and `src/components/brand.tsx`.
- [ ] **Step 6: Verify.** Run `npm run lint && npm run build`. Expected: both pass. Run `grep -rn "accent\|violet" src tailwind.config.ts`. Expected: no matches.

---

### Task 2: End game

**Files:**
- Create: `src/components/end-game-button.tsx`, `src/app/host/dashboard/active-games.tsx`
- Modify: `src/app/host/game/[id]/page.tsx`, `src/app/host/dashboard/page.tsx`, `src/app/host/dashboard/how-to/page.mdx`

**Interfaces:**
- Produces: `EndGameButton({ gameId, onEnded, className }: { gameId: string; onEnded?: () => void; className?: string })`. Click shows "End this game now?" with **Confirm** and **Cancel** (no browser dialog). Confirm runs `supabase.from('games').update({ phase: 'result' }).eq('id', gameId).select('id')`. If the call errors, or returns zero rows (RLS denial), show `Notice` with "Could not end the game. Try again." and stay on the confirm state. On success call `onEnded`.
- Produces: `ActiveGames()` default export, no props.

- [ ] **Step 1: Implement `EndGameButton`** as above in `src/components/end-game-button.tsx`, using `Button` and `Notice`. Disable Confirm while the request runs.
- [ ] **Step 2: Mount it on the host game page.** In `host/game/[id]/page.tsx`, render `<EndGameButton gameId={gameId} className="fixed left-4 top-4 z-20" />` when `currentScreen !== AdminScreens.result`. No `onEnded` needed: the realtime UPDATE handler switches screens.
- [ ] **Step 3: Guard unloaded quiz set.** In the same file render `Quiz` only when `quizSet` is loaded and `quizSet.questions[currentQuestionSequence]` exists, and `Results` only when `quizSet` is loaded; otherwise show a plain "Loading game" line. Remove the `quizSet!` assertions.
- [ ] **Step 4: Implement `ActiveGames`.** Query `games` with `select('id, created_at, phase, quiz_sets(name), participants(count)')`, `.eq('host_user_id', user.id)` (user from `supabase.auth.getUser()`), `.neq('phase', 'result')`, `.order('created_at', { ascending: false })`. Render nothing while loading or when empty. Heading "Active games"; each row shows quiz name, phase (Lobby or In progress), player count, start time in HKT, a **Resume** link (`target="_blank" rel="noopener noreferrer"`, `btn-secondary`, to `/host/game/{id}`) and `EndGameButton` whose `onEnded` removes the row. Load errors use `Notice` "Could not load active games. Refresh the page to try again."
- [ ] **Step 5: Mount `ActiveGames`** above the "Quiz sets" heading in `host/dashboard/page.tsx`.
- [ ] **Step 6: How-to page.** Read `how-to/page.mdx` and add one short step or note: use **End game** on the game screen, or **End** under Active games on the dashboard, to finish early and show results. Match the page's existing tone.
- [ ] **Step 7: Verify.** Run `npm run lint && npm run build`. Expected: pass. Manual check against local Supabase (start it first; `docker ps` shows its containers, the `supabase` CLI is not on PATH, so use `npx supabase start` only if the containers are down): (a) create a game, End game in the lobby, host shows results and a joined player phone shows "Thanks for playing"; (b) End during a question, same result; (c) the dashboard lists a lobby game and a running game, **Resume** opens the host screen without a crash, **End** removes the row; (d) sign in as a different host and confirm the End on a game you do not own shows the failure notice (temporarily call it with another game id from the browser console to simulate).

---

### Task 3: Host lobby and question screens

**Files:**
- Modify: `src/app/host/game/[id]/lobby.tsx`, `src/app/host/game/[id]/quiz.tsx`

**Interfaces:**
- Consumes: tokens, `BrandLogo`, animations from Task 1. The End game button from Task 2 sits fixed at top-left; keep that corner free. The existing Next button stays top-right.

- [ ] **Step 1: Lobby.** Dark `bg-ink` page with a subtle brand-blue radial gradient, `BrandLogo` at top left of the content (below the End button area), heading "Players" with count, player chips in `bg-brand` (white text) with `animate-fade-up`, QR card with heading "Scan to join", and the join URL as text under the QR code. Start button large. Empty state line "Waiting for players" with `animate-pulse-soft`.
- [ ] **Step 2: Question screen.** Larger question card; answer tiles with a letter badge (A, B, C, D, same as the player screen); timer and answer counter styled to the palette (timer colours from the brand blue to the existing warning colours, not violet); choices fade in with `animate-fade-up`; reveal bars use `animate-grow`, the correct tile keeps full opacity with the tick, wrong tiles stay dimmed. Keep all existing logic, timers, props and the odd-count `col-span-2` rule unchanged. Counts shown on bars stay.
- [ ] **Step 3: Verify.** `npm run lint && npm run build` pass. Visual check in Task 6.

---

### Task 4: Host scoreboard

**Files:**
- Modify: `src/app/host/game/[id]/scoreboard.tsx`

- [ ] **Step 1: Restyle only.** Dark brand background, logo-free, heading "Top 5", rank badges (top 3 filled `bg-brand`, white text; others outlined), card rows keep the existing absolute positioning, `ROW_HEIGHT`, transitions and `data-*` attributes unchanged. Up and down arrows keep their green and red.
- [ ] **Step 2: Verify.** `npm run lint && npm run build` pass; `cd "src/app/host/game/[id]" && npx --yes tsx --test ./scoreboard-rank.test.ts` still passes.

---

### Task 5: Host results and podium

**Files:**
- Create: `src/app/host/game/[id]/podium.ts`, `src/app/host/game/[id]/podium.test.ts`
- Modify: `src/app/host/game/[id]/results.tsx`

**Interfaces:**
- Produces: `rankRows<T extends { total_score: number | null }>(rows: T[]): (T & { rank: number })[]` (rows sorted by score descending, competition rank, e.g. 1, 1, 3; `null` score counts as 0) and `splitPodium<T>(rows: (T & { rank: number })[]): { podium: (T & { rank: number })[]; rest: (T & { rank: number })[] }` (`podium` is the first 3 rows in order, `rest` is everything after, ranks unchanged).

- [ ] **Step 1: Write failing tests** in `podium.test.ts` (`node:test`, `node:assert/strict`):
  - `rankRows` gives ranks `[1, 1, 3]` for scores `[50, 50, 10]` and treats `null` as 0.
  - `rankRows([])` returns `[]`.
  - `splitPodium` with 5 rows returns 3 podium and 2 rest; with 2 rows returns 2 podium and 0 rest; with 4 rows all rank 1 returns 3 podium and 1 rest, all rank 1.
- [ ] **Step 2: Run to confirm failure.** `cd "src/app/host/game/[id]" && npx --yes tsx --test ./podium.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement `podium.ts`** with the signatures above. Sort stable by score descending, ties keep input order.
- [ ] **Step 4: Run tests.** Same command. Expected: all pass.
- [ ] **Step 5: Restyle `results.tsx`.** Replace the inline `rankOf` with `rankRows`. Show the quiz name, then a podium for `podium` (centre tallest for rank order 1, left 2, right 3 only when 3 rows; with fewer rows render them left to right without empty slots), then `rest` as card rows. Keep `Confetti` (respect reduced motion by not rendering it when `prefers-reduced-motion: reduce`). Empty list renders a plain "No players joined this game" line. Keep the `game_results` query as is.
- [ ] **Step 6: Verify.** Lint and build pass; tests pass.

---

### Task 6: Player screens and final check

**Files:**
- Modify: `src/app/game/[id]/page.tsx`, `src/app/game/[id]/lobby.tsx`, `src/app/game/[id]/quiz.tsx`

- [ ] **Step 1: Join and waiting.** Brand card with `BrandLogo onDark={false}` above the nickname field; waiting state shows "You are in. Wait for the host to start the game." with an `animate-pulse-soft` indicator. Keep all registration logic and copy meaning; remove exclamation marks and the stray `！` greeting punctuation only if it changes no behaviour (copy only).
- [ ] **Step 2: Question and feedback.** Larger answer buttons, press state (`active:scale-95` under `motion-safe:`), choices `animate-fade-up`; "Wait for others to answer" gets the soft pulse; Correct / Incorrect screen uses a large icon circle with `animate-pop` and the existing green and red. Logic, scoring and props unchanged.
- [ ] **Step 3: Thanks screen.** Brand card in `Results` inside `page.tsx`, same copy meaning.
- [ ] **Step 4: Full verification.** `npm run lint && npm run build`; run all `*.test.ts` with `npx --yes tsx --test` from each folder (`quizzes/`, `host/game/[id]/`). Then, with local Supabase running and `npm run dev`, play one game with two phone-width windows (375 px) and one host window (1280 px) through lobby, question, reveal, scoreboard and results. Check: long nickname (20 characters), long question, a 3-choice question, End game with zero players, reduced motion on (OS setting) shows every state without animation. Report anything not checked.
