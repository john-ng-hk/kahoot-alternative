# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install`, `npm run dev` (http://localhost:3000), `npm run build`, `npm run lint`
- `supabase start` is required before `npm run dev` (local Postgres, auth and realtime). Seed data in `supabase/seed.sql` is loaded on `supabase db reset`.
- Regenerate DB types after any migration: `supabase gen types typescript --local --schema public > src/types/supabase.ts`
- No test framework. Pure logic has `node:test` tests (`*.test.ts`). Run one with `npx --yes tsx --test ./file.test.ts` from inside its folder (a path containing `[id]` is read as a glob, so `cd` into it first).
- `.npmrc` sets `min-release-age=3`: npm refuses package versions published less than 3 days ago.
- Env vars: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (read in `src/types/types.ts`).

## Architecture

Next.js 14 App Router, all client components, Tailwind. There is no custom backend: the browser talks to Supabase directly through the single `supabase` client exported from `src/types/types.ts`. That file also defines the app's domain types (`Question`, `QuizSet` etc.) derived from the generated `src/types/supabase.ts`.

Routes:
- `/` player entry; `/game/[id]` player game screen
- `/host`, `/host/dashboard` (pick a quiz set, create a game), `/host/game/[id]` host game screen
- `/host/dashboard/quizzes` (my quizzes), `/new`, `/[id]` (editor), `/import` (JSON import)

### Game state machine

Game flow is driven by one row in the `games` table, not by messages between clients:
- `phase` is `lobby` → `quiz` → `result` (DB check constraint).
- `current_question_sequence` is the index into the quiz set's questions (ordered by `questions.order`).
- `is_answer_revealed` is the per-question reveal flag.

The host page (`src/app/host/game/[id]/`) is the only writer. It updates the `games` row (lobby start, `quiz.tsx` for reveal and next question). Player pages (`src/app/game/[id]/`) and the host page subscribe to Supabase Realtime `postgres_changes` on `games` (UPDATE), `participants` (INSERT) and `answers` (INSERT), and swap the screen component (`Lobby` / `Quiz` / `Results`) from the row's `phase`. Timing constants are in `src/constants.ts`; the host runs the countdown timers.

The top-5 scoreboard after each revealed question (not the last) is host-only local state in `quiz.tsx`, not a `phase` value: players stay on their reveal screen. Ranking and rank movement are in `scoreboard-rank.ts`; `scoreboard.tsx` animates with CSS transforms.

When changing the schema, keep realtime subscriptions and the type files in step. New tables that clients subscribe to need realtime enabled.

### Auth and RLS

Players use Supabase anonymous sign-in (`auth.signInAnonymously()`), with the session reused if present. Hosts sign in by email (`sign-in-gate.tsx`): a 6 to 10 digit code or the link in the same email (mail scanners can use up the link, not the code). Email setup and its Supabase settings: [docs/email-sign-in.md](docs/email-sign-in.md). Authorisation relies on RLS (`supabase/migrations/*_rls.sql`): quiz data is readable by everyone, and only `games.host_user_id = auth.uid()` can insert or update a game. Any new table needs explicit RLS policies.

### Data

- Schema: `supabase/migrations/`. `game_results` is a view (`*_result_view.sql`) used by the host results screen.
- Seed quizzes in `supabase/seed.sql` are added through the `add_question(quiz_set_id, body, order, choices json[])` SQL function. New question sets (e.g. the `lwNN` launch-week sets) follow this pattern.
- Quizzes are owned by email users (`quiz_sets.owner_user_id`) and written through the `save_quiz_set` function. The editor and the import page both use it.
- Import file format and rules are in `src/app/host/dashboard/quizzes/import-format.ts` (example: `public/quiz-import-example.json`). The whole file is validated first; nothing is saved if it has an error.
- `src/app/host/dashboard/how-to/page.mdx` is an MDX page (via `@next/mdx` and `src/mdx-components.tsx`).
