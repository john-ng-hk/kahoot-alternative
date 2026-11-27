# Scoreboard and quiz import: design

Size: small change (two small features, no schema change). Status: awaiting approval.

## Intent
- **Scoreboard:** after each question's answers are revealed, the host screen shows the top 5 players, with an animation when ranks change. This matches the Kahoot flow and keeps the room engaged between questions.
- **Import:** a host uploads a JSON file to create quizzes with questions and correct answers in bulk, instead of typing them in the editor.

## Goals
- Scoreboard on the host screen only. Players keep the current reveal screen.
- Rank-change animation without a new package.
- Import validates the whole file with the editor's rules and reports errors by quiz and question number.

## Non-goals
- No scoreboard on player phones (can be added later).
- No new `games.phase` value, migration or type regeneration.
- No export, no import into an existing quiz, no question images.
- No scoreboard after the last question (Results follows it).

## Constraints
- RLS: import is for email users only, like the editor. It uses `save_quiz_set` as-is.
- Limits stay as in `quiz-draft.ts`: question 1 to 200 characters, choice 1 to 100, 2 to 4 choices, one correct.
- `.npmrc` `min-release-age=3` applies if any package is added (none planned).

## Approaches
**Scoreboard flow**
- A. Host-local state (chosen). "Next" after reveal shows the scoreboard. "Continue" updates the `games` row as today. No DB or player change. Cost: a host refresh during the scoreboard returns to the reveal screen.
- B. New `scoreboard` phase in `games`. Survives refresh and allows player-side screens, but needs a migration, type changes and player-page handling. Rejected as more work with no current benefit.

**Import format**
- A. Index-based (chosen): `choices` is a list of strings and `correct` is the zero-based index of the right one. One correct answer is guaranteed by design.
- B. Mirror the DB (`{body, is_correct}` per choice). Rejected: longer, and the one-correct rule needs checking.

## Design

### Scoreboard
- New component `src/app/host/game/[id]/scoreboard.tsx`, rendered by `quiz.tsx` after the host presses "Next" on a revealed question (not for the last question, which goes to Results as now).
- Data: read `game_results` for the game (current totals). Previous totals = current total minus each player's score for the current question, taken from the `answers` already held in `quiz.tsx` state. Players who did not answer keep their total.
- Ranking: competition ranking (ties share a rank, as in `results.tsx`). Order ties by nickname for a stable layout. Show the top 5 by current rank (ties at 5th place may show more than 5).
- Animation (CSS only): rows are absolutely positioned at `rank * rowHeight`. First render uses previous rank, then the next frame sets the current rank, so the CSS `transition: transform` moves the rows. Score counts up. Rows entering the top 5 fade in. A row that moved shows ▲n or ▼n. Respect `prefers-reduced-motion` by skipping movement.
- "Continue" calls the existing `getNextQuestion`.
- Late answers: `onTimeUp` fires when time ends or all have answered, so all answers are normally in. The scoreboard reads totals when it opens.

### Import
- New page `src/app/host/dashboard/quizzes/import/page.tsx`, linked from "My quizzes" next to "New quiz".
- File format:
  ```json
  { "quizzes": [ { "name": "Week 1", "description": "optional",
    "questions": [ { "body": "2+2?", "choices": ["3","4","5"], "correct": 1 } ] } ] }
  ```
- New pure module `import-format.ts`: parse and validate the file, map each quiz to the draft shape (`choices[i]` becomes `{body, is_correct: i === correct}`), and run `validateDraft`. Errors read like "Quiz 2, question 3: ...". Checks: valid JSON, `quizzes` is a non-empty list, `correct` is an integer inside the choice range, strings are strings.
- If any quiz is invalid, nothing is saved. Otherwise call `save_quiz_set` per quiz in order. If a call fails midway, show which quizzes were saved and which failed.
- The page shows a short format guide and a downloadable example file. On success it goes to "My quizzes".

## Left to the builder
- Row height, colours and timing of the animation, in line with the existing brand styles in `globals.css`.
- Maximum file size and quiz count (suggest 1 MB and 50 quizzes).
- Exact copy of the format guide.
- No test framework exists. `import-format.ts` is pure, so verify it with a small script or a manual check list. Verify the scoreboard manually with a local game.
