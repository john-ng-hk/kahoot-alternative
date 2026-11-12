# UI revamp: design

Date: 2026-11-12
Status: draft, awaiting approval

## Intent

The app works, but the screens look unstyled and inconsistent. The home page at `/` is a placeholder that says "Host Home". The host and player screens use ad-hoc Tailwind classes with no shared look. The revamp gives hosts and players one clear, mobile-friendly visual system. Game behaviour stays the same.

## Goals

- Restyle every screen in scope with one shared visual system (colours, type scale, spacing, radius, shadow, buttons, cards).
- Mobile-first for players. Layouts work at 375 px width and up.
- Accessible: text contrast at WCAG AA or better, tap targets at least 44 px, visible focus states, and answer options that do not rely on colour alone (each option has a shape or letter label).
- Clear empty, loading and error states on screens that currently show nothing or use `alert()`.
- Keep the Tailwind setup. Add tokens in `tailwind.config.ts` and reusable classes in `globals.css`.

## Non-goals

- No change to game logic, the `games.phase` state machine, realtime subscriptions, timing constants (`src/constants.ts`), RLS policies, or database schema.
- No IMHK or Ingram Micro branding. The app keeps a neutral look.
- No new game features. Only UI states that the restyle needs are in scope.
- No new UI library or component framework. Use Tailwind and plain React.

## Anti-goals

- A restyle that breaks the game on a phone, for example a question screen that scrolls past the answer buttons during a 20-second timer.
- A restyle that changes what a player or host must click to play. The flow stays the same.

## Constraints

- Next.js 14 App Router, all client components, Tailwind 3, Inter font already loaded in `src/app/layout.tsx`.
- No test framework. Verify with `npm run lint`, `npm run build`, and a manual two-player run against `supabase start`.
- The design direction comes from the `frontend-design:frontend-design` skill. The "UI UX Pro" skill is not installed on this machine.

## Screens in scope

| Route | Screen |
|---|---|
| `/`, `/host` | Not in scope. `next.config.mjs` redirects both to `/host/dashboard`, so the placeholder `page.tsx` files never render. No landing page is built. Players join only through the QR code or URL from the host lobby, so no join link is needed. |
| `/host/dashboard` | Quiz set list, "Start Game" button. Layout with side menu. |
| `/host/dashboard/how-to` | MDX how-to page. Restyle through `src/mdx-components.tsx`. |
| `/host/game/[id]` | Host lobby, quiz (with reveal and next controls), results. |
| `/game/[id]` | Player lobby, quiz, result. |

## Decisions already made

- Use `frontend-design:frontend-design` as the design skill.
- Brand: neutral. No IMHK colours.
- Scope: restyle and re-layout all screens above. Game logic and Supabase code stay unchanged.
- Quiz editor (later phase): add an owner column to `quiz_sets` and RLS so each host can only change their own quizzes. This is not part of the revamp, but the revamp must not block it.
- No landing page. `/` and `/host` redirect to the host dashboard (correction to the approved draft, which wrongly planned a landing page). No join form, since the schema has no join code.
- Results: the `game_results` view lists all participants, with score 0 for non-answerers, shown in score order.

## Open item

- Confirm the migration `20261112000000_result_view_include_all_participants.sql` is applied to the live database. Not verified from this repo.

## My calls (not discussed with the user)

- Four answer options use four distinct colours plus a shape and letter label, so colour is not the only signal.
- Shared pieces are a small set of Tailwind tokens, a `Button`, a `Card`, and a page shell. These go in `src/components/` or `globals.css`, not a new folder structure.
- Existing `public/default.png` stays as the quiz set image fallback. `public/background.jpg` stays unused unless the design needs it.
- Existing `alert()` calls on screens in scope are replaced with inline error messages.
- Each change stays inside the files of the screen it restyles. No unrelated refactors.
- Host screens (lobby, quiz, results) are sized for a projector, so the type and answer layout are readable from across a room. They are also checked on a laptop screen.
- The `game_results` view (`supabase/migrations/20261112000000_result_view_include_all_participants.sql`) lists every participant, with a score of 0 for players who never answered. The revamp does not change the view. Results screens show whatever the view returns.

## Verification

1. `npm run lint` and `npm run build` pass.
2. `supabase start`, `npm run dev`, then run one host and two player browsers (one at phone width) through lobby, two questions with reveal, and results.
3. Check contrast and tap target size on each screen in scope.

## Phase 2: quiz editor (separate design later)

- Migration: add `owner_user_id uuid references auth.users(id)` to `quiz_sets`. Existing seed rows stay public (owner null), so only owners can change their own sets.
- RLS: keep "everyone can select". Add insert, update and delete only when `auth.uid() = owner_user_id`. Questions and choices follow the owner through their quiz set.
- Regenerate types with `supabase gen types typescript --local --schema public > src/types/supabase.ts`.
- The `add_question` SQL function is seed-only. The editor writes through normal table calls under RLS.
- Realtime is not needed for the editor.
