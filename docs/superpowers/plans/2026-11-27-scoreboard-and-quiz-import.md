# Scoreboard and Quiz Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a top-5 scoreboard with rank-change animation on the host screen after each revealed question, and let hosts bulk-import quizzes from a JSON file.

**Architecture:** Pure, dependency-free logic modules (`scoreboard-rank.ts`, `import-format.ts`) with `node:test` tests, plus thin React components. Scoreboard is host-local state in `quiz.tsx` (no DB or player change). Import reuses `validateDraft` and the existing `save_quiz_set` RPC.

**Tech Stack:** Next.js 14 App Router (client components), Tailwind, Supabase JS. No new packages.

**Spec:** `docs/superpowers/specs/2026-11-27-scoreboard-and-quiz-import-design.md`

## Global Constraints

- No schema change, no new `games.phase`, no type regeneration.
- No new npm dependency (`.npmrc` `min-release-age=3` applies). Tests run with `npx --yes tsx --test <file>` (one-off, nothing added to `package.json`).
- Limits come from `src/app/host/dashboard/quizzes/quiz-draft.ts`: question 1 to 200 characters, choice 1 to 100, 2 to 4 choices, exactly one correct.
- Import limits: file 1 MB (`MAX_IMPORT_BYTES = 1_000_000`), 50 quizzes (`MAX_IMPORT_QUIZZES = 50`).
- Scoreboard: top 5, competition ranking (ties share a rank, e.g. 1, 1, 3), host screen only, not shown after the last question.
- Import file format (index-based):
  `{ "quizzes": [ { "name": "Week 1", "description": "optional", "questions": [ { "body": "2+2?", "choices": ["3","4","5"], "correct": 1 } ] } ] }`
- Validate the whole file first. Save nothing if any quiz is invalid.
- Hong Kong English in all copy and comments (optimised, colour, organisation). Plain language.
- Do not commit or push. The user commits when they ask.

## Review Focus

- Nobody answered correctly (everyone at 0, all rank 1): show 5 rows, no rank-change arrows, no crash with 40 tied players.
- A player did not answer this question: previous total equals total, so no change.
- A player enters the top 5 from below: fades in, no arrow from a fake position.
- `game_results.total_score` is null for a player: treat as 0.
- Import file is empty, not JSON, has a BOM, or is over 1 MB: clear error, nothing saved.
- `correct` is a string, a float, negative or out of range: rejected with quiz and question number.
- A quiz fails to save midway: show which quizzes were saved and which failed.
- Host with `prefers-reduced-motion`: scoreboard shows the final order without movement.

---

### Task 1: Scoreboard ranking logic

**Files:**
- Create: `src/app/host/game/[id]/scoreboard-rank.ts`
- Test: `src/app/host/game/[id]/scoreboard-rank.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type ScoreRow = { participantId: string; nickname: string; total: number; previousTotal: number }
  export type RankedRow = ScoreRow & {
    rank: number          // competition rank by total
    previousRank: number  // competition rank by previousTotal, over all players
    previousPosition: number // 0-based index in the previous ordering (ties by nickname)
    change: number        // previousRank - rank; positive = moved up
  }
  export function buildScoreboard(rows: ScoreRow[], limit?: number): RankedRow[] // limit default 5
  ```
  Result is ordered by total descending, ties by nickname (`localeCompare`), and cut to exactly `limit` rows.

- [ ] **Step 1: Write the failing tests** with `node:test` and `node:assert/strict`. Test names and assertions:
  - `orders by total and sets rank, previousRank and change`: A (previous 100, total 100), B (previous 0, total 300) gives B `{rank:1, previousRank:2, change:1}` first, A `{rank:2, previousRank:1, change:-1}` second.
  - `tied players share a rank and sort by nickname`: totals 500 ("Zoe"), 500 ("Amy"), 300 ("Bob") gives order Amy, Zoe, Bob with ranks `[1, 1, 3]`.
  - `cuts to the limit`: 7 players with distinct totals returns 5 rows; the lowest two are absent.
  - `everyone tied at 0 returns 5 rows, all rank 1, change 0`: 40 players, all totals and previous totals 0.
  - `no answers this question means change 0`: every row has `previousTotal === total`, every `change === 0`.
  - `player entering top 5 has previousPosition >= 5`: 6 players, the previous last place overtakes to first; its `previousPosition` is 5 and `change` is 5.
  - `previousRank is computed over all players, not only the top 5`: same 6-player case, `previousRank` is 6.

- [ ] **Step 2: Run to verify it fails**

  Run: `npx --yes tsx --test "src/app/host/game/[id]/scoreboard-rank.test.ts"`
  Expected: FAIL (module not found).

- [ ] **Step 3: Implement `buildScoreboard`** in `scoreboard-rank.ts`. Sort a copy by `previousTotal` desc then nickname to get `previousPosition` and `previousRank`; sort by `total` desc then nickname for the final order and `rank`. Rank = 1 + number of players with a strictly higher total.

- [ ] **Step 4: Run to verify it passes**

  Run: same command. Expected: all 7 tests PASS.

---

### Task 2: Scoreboard screen and host flow

**Files:**
- Create: `src/app/host/game/[id]/scoreboard.tsx`
- Modify: `src/app/host/game/[id]/quiz.tsx` (the `Next` button block near line 94, `getNextQuestion`, and the reset in `useEffect`)

**Interfaces:**
- Consumes: `buildScoreboard`, `RankedRow`, `ScoreRow` from Task 1.
- Produces: `export default function Scoreboard(props: { gameId: string; questionId: string; onContinue: () => void }): JSX.Element`

- [ ] **Step 1: Implement data loading in `Scoreboard`.** On mount, query `game_results` (`participant_id, nickname, total_score`) with `.eq('game_id', gameId)`, and `answers` (`participant_id, score`) with `.eq('question_id', questionId)`. Build `ScoreRow[]`: `total = total_score ?? 0`, `previousTotal = total - (this question's score for that participant, 0 if none)`. Show errors in the existing `Notice`. Both tables are readable by everyone under current RLS.

- [ ] **Step 2: Implement the animation in `Scoreboard`.**
  - `ROW_HEIGHT = 72` (px) and a container of `5 * ROW_HEIGHT` height, rows `absolute`, positioned with `transform: translateY(...)` by display index (not rank, because ties share a rank).
  - Initial render (`settled = false`): each row at `previousPosition * ROW_HEIGHT`; rows with `previousPosition >= 5` sit at `5 * ROW_HEIGHT` with opacity 0. After about 600 ms (so the host first sees the old order), set `settled = true`: rows move to `index * ROW_HEIGHT`, opacity 1. Use `transition-transform duration-700` and `transition-opacity`, with `motion-reduce:transition-none`.
  - Score counts up from `previousTotal` to `total` over about 800 ms using `requestAnimationFrame`.
  - A row with `change > 0` shows `▲{change}`, `change < 0` shows `▼{abs}`, otherwise nothing. Use existing styles: `card`, dark `bg-ink` page, `btn-primary` for the Continue button via the existing `Button` component.
  - If `window.matchMedia('(prefers-reduced-motion: reduce)').matches`, set `settled = true` immediately and skip the count-up.
  - Heading "Top 5". "Continue" button calls `onContinue`.

- [ ] **Step 3: Wire into `quiz.tsx`.**
  - Add `const [showScoreboard, setShowScoreboard] = useState(false)`; reset it to `false` in the existing `useEffect` that runs on `question.id`.
  - The top-right "Next" button: if `questionCount == question.order + 1` call `getNextQuestion` (unchanged behaviour for the last question), otherwise `setShowScoreboard(true)`.
  - When `showScoreboard` is true, return `<Scoreboard gameId={gameId} questionId={question.id} onContinue={getNextQuestion} />` instead of the question view. Keep the realtime `answers` subscription mounted (it is in the effect, not in the returned view).

- [ ] **Step 4: Verify types and lint**

  Run: `npx tsc --noEmit && npm run lint`
  Expected: no errors.

- [ ] **Step 5: Manual check with a local game.** Run `supabase start` then `npm run dev`. Create a game from a quiz with at least 3 questions, join with 3 browser windows, answer so ranks change after question 2. Expected:
  - After reveal, "Next" opens "Top 5" showing the previous order, then rows move to the new order with ▲/▼ and scores counting up.
  - "Continue" shows the next question; players' phones never left the reveal screen.
  - On the last question, "Next" goes to Results with no scoreboard.
  - Question 1 where nobody is correct: rows at 0, rank 1, no arrows.
  - Host refresh on the scoreboard returns to the reveal screen with "Next" available.

---

### Task 3: Import file parsing and validation

**Files:**
- Create: `src/app/host/dashboard/quizzes/import-format.ts`
- Test: `src/app/host/dashboard/quizzes/import-format.test.ts`

**Interfaces:**
- Consumes: `DraftQuestion`, `validateDraft` from `./quiz-draft`.
- Produces:
  ```ts
  export const MAX_IMPORT_BYTES = 1_000_000
  export const MAX_IMPORT_QUIZZES = 50
  export type ImportQuiz = { name: string; description: string | null; questions: DraftQuestion[] }
  export type ParseResult = { ok: true; quizzes: ImportQuiz[] } | { ok: false; error: string }
  export function parseImportFile(text: string): ParseResult
  ```
  Errors read `Quiz 2: Question 3: mark exactly one correct choice.` (quiz number, then the `validateDraft` message). Structural errors name the quiz and question number, for example `Quiz 1, question 2: "correct" must be a whole number from 0 to 2.`

- [ ] **Step 1: Write the failing tests** (`node:test`). Test names and assertions:
  - `accepts the example file`: parse the spec's example JSON; result `ok`, one quiz, `choices[1].is_correct === true`, others false, `description` null when absent.
  - `strips a leading BOM`: same JSON prefixed with `﻿` is ok.
  - `rejects invalid JSON`, `rejects empty text`: `ok === false` with a readable message.
  - `rejects text over MAX_IMPORT_BYTES`.
  - `rejects missing or empty quizzes list`; `rejects more than MAX_IMPORT_QUIZZES quizzes`.
  - `rejects a quiz with no questions` (my call: at least 1 question on import).
  - `rejects correct that is a string, float, negative or out of range`: error contains `Quiz 1, question 1`.
  - `rejects non-string choices and non-string description`.
  - `reuses editor limits`: a 201-character question gives the `validateDraft` message prefixed with `Quiz 1: `.
  - `reports the first error with the right quiz number`: quiz 2 invalid gives `Quiz 2:`.
  - `trims name and question text is left for the RPC`: `name: "  A  "` returns `"A"`.

- [ ] **Step 2: Run to verify it fails**

  Run: `npx --yes tsx --test src/app/host/dashboard/quizzes/import-format.test.ts`
  Expected: FAIL (module not found).

- [ ] **Step 3: Implement `parseImportFile`.** Check size with `new Blob([text]).size`, strip BOM, `JSON.parse` in try/catch, check structure, map `choices[i]` to `{ body, is_correct: i === correct }`, then call `validateDraft(name, questions)` per quiz and prefix the message with `Quiz n: `. Return the first error only.

- [ ] **Step 4: Run to verify it passes**

  Run: same command. Expected: all tests PASS.

---

### Task 4: Import page, link and example file

**Files:**
- Create: `src/app/host/dashboard/quizzes/import/page.tsx`
- Create: `public/quiz-import-example.json`
- Modify: `src/app/host/dashboard/quizzes/page.tsx` (add an "Import" link beside "New quiz", about line 125)

**Interfaces:**
- Consumes: `parseImportFile`, `ImportQuiz` from Task 3; `supabase.rpc('save_quiz_set', { p_id: null, p_name, p_description, p_questions: questions as Json })` as used in `quizzes/page.tsx` `duplicate`.
- Produces: route `/host/dashboard/quizzes/import`.

- [ ] **Step 1: Create `public/quiz-import-example.json`** with two quizzes (one with a description, one without), 2 to 4 questions each, valid under the format in Global Constraints.

- [ ] **Step 2: Implement the page** (`'use client'`, same imports and styling as `quizzes/page.tsx`):
  - Heading "Import quizzes", a short format guide (the JSON shape, limits, "`correct` is the position of the right choice, starting at 0"), and a link to `/quiz-import-example.json` with `download`.
  - `<input type="file" accept=".json,application/json">`. On select: read text with `file.text()`, call `parseImportFile`, show the error in `Notice` or a summary "N quizzes, M questions" with an "Import" button.
  - On Import: save quizzes one by one with `save_quiz_set`. Stop at the first RPC error. Show "Saved X of N. Failed at quiz K (name): message" and keep the page open. On full success, `router.push('/host/dashboard/quizzes')`.
  - Disable the button while saving to prevent double submit.

- [ ] **Step 3: Add the "Import" link** as `btn-secondary` next to "New quiz" in the header row of `quizzes/page.tsx`.

- [ ] **Step 4: Verify types, lint and build**

  Run: `npx tsc --noEmit && npm run lint && npm run build`
  Expected: no errors.

- [ ] **Step 5: Manual check.** Sign in as an email user. Expected:
  - The example file imports 2 quizzes, which appear in "My quizzes" with correct answers matching `correct`.
  - A file with one invalid quiz imports nothing and names the quiz and question.
  - An empty file, a text file and a 2 MB file each give a clear error.
  - Signed out or anonymous users still see the existing sign-in gate.

---

## Self-review notes

- Spec coverage: scoreboard flow, data, ranking, animation, reduced motion, skip on last question (Tasks 1 and 2); import page, format, whole-file validation, per-quiz save, partial-failure report, example download, link (Tasks 3 and 4).
- Deviation from spec, my call: the scoreboard always shows exactly 5 rows (ties at 5th are cut by nickname), because a 0-point tie among many players would fill the screen.
- Extra call: an imported quiz must have at least one question.
