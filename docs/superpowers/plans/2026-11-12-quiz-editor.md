# Quiz Editor Implementation Plan

> **For agentic workers:** Execute inline, task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hosts sign in with email and create, edit, duplicate and delete their own quizzes in the app.

**Architecture:** Owner column and RLS in Postgres. One transactional `save_quiz_set` function writes a whole quiz. Next.js client pages under `/host/dashboard/quizzes`. Host dashboard requires email sign-in.

**Tech Stack:** Next.js 14 App Router (client components), React 18, TypeScript, Tailwind 3, Supabase (Postgres, RLS, auth), local stack via Docker.

**Spec:** `docs/superpowers/specs/2026-11-12-quiz-editor-design.md`. The spec is binding. Where this plan is silent, follow the spec.

## Global Constraints

- Hong Kong English in comments and docs.
- Keep diffs minimal. Do not change game logic, realtime subscriptions, or timing constants.
- No test framework is configured. Verification is SQL checks against the local DB, `npm run lint`, `npm run build`, and browser checks.
- Do not commit or push. The user commits.
- Never print the anon key from `.env.local`.

## Review Focus

- Anonymous session writes a quiz: must be denied by RLS, not only by the UI.
- Quiz with games: delete, rename, and question/choice edits must all be denied in the database.
- Save with a race against a new game: the save must lock the quiz row first.
- Save with invalid input (1 or 5 choices, 0 or 2 correct, empty or over-length bodies): nothing is written.
- Magic link from an existing anonymous session: the session becomes the email user.

---

### Task 1: Migration

**Files:**
- Create: `supabase/migrations/20261112130000_quiz_editor.sql`

**Interfaces:**
- Produces: `quiz_sets.owner_user_id`; `public.is_email_user()`; `public.can_edit_quiz(uuid)`; `public.save_quiz_set(p_id uuid, p_name text, p_description text, p_questions jsonb) returns uuid`.

- [ ] **Step 1: Write the migration**

Contents, in order:
1. `alter table public.quiz_sets add column owner_user_id uuid references auth.users(id) on delete set null;` then `alter table public.quiz_sets alter column owner_user_id set default auth.uid();` (add the default after the column, so existing rows stay null).
2. `is_email_user()`: `sql stable`. True when `auth.uid()` is not null and `coalesce((auth.jwt() ->> 'is_anonymous')::boolean, true) = false`.
3. `can_edit_quiz(qs uuid)`: `sql stable`. True when `is_email_user()`, the quiz set's `owner_user_id = auth.uid()`, and no `games` row references it.
4. Policies. Drop nothing; the existing public select policies stay.
   - `quiz_sets` insert: `with check (owner_user_id = auth.uid() and public.is_email_user())`.
   - `quiz_sets` update: `using (public.can_edit_quiz(id)) with check (public.can_edit_quiz(id))`.
   - `quiz_sets` delete: `using (public.can_edit_quiz(id))`.
   - `questions` insert, update, delete: `public.can_edit_quiz(quiz_set_id)`.
   - `choices` insert, update, delete: `public.can_edit_quiz((select q.quiz_set_id from public.questions q where q.id = choices.question_id))`.
5. `save_quiz_set`, `security invoker`, `set search_path = public`:
   - Check the name is not blank after trim.
   - Check `p_questions` is a JSON array.
   - If `p_id` is null: insert a quiz set. The owner default fills in `owner_user_id`.
   - If `p_id` is set: `perform 1 from quiz_sets where id = p_id for update`. This lock blocks a concurrent game insert. If no row is found, raise. Then check `can_edit_quiz(p_id)`; raise if false. Update name and description, then `delete from questions where quiz_set_id = p_id`. Choices cascade.
   - For each question, with `i` as the array index: check body length after trim is 1 to 200. Check the choices array has 2 to 4 items. Check each choice body is 1 to 100 characters. Check exactly one choice has `is_correct` true. Insert the question with `"order" = i`, then insert its choices.
   - Return the quiz set id.
   - Grant execute to `authenticated` and `anon` (RLS and the owner check decide access).

- [ ] **Step 2: Apply to the local DB**

Run:
`docker exec -i supabase_db_kahoot-alternative psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/migrations/20261112130000_quiz_editor.sql`

Expected: no errors.

Then record it:
`docker exec supabase_db_kahoot-alternative psql -U postgres -d postgres -c "insert into supabase_migrations.schema_migrations (version, name) values ('20261112130000','quiz_editor')"`

- [ ] **Step 3: SQL checks**

Write `/tmp/quiz_editor_checks.sql`. It runs inside `begin; ... rollback;`, so nothing is kept. It inserts two `auth.users` rows: an email owner and an anonymous user. It sets `role authenticated` and `request.jwt.claims` for each case. Cases:
- anonymous user cannot insert a quiz set with their own id (expect error);
- email owner can create a quiz set with `save_quiz_set(null, ...)` and it returns an id;
- email owner can save a valid quiz (2 choices, 1 correct);
- non-owner email user cannot update it (expect error from `save_quiz_set`);
- invalid saves are rejected: 1 choice, 5 choices, 0 correct, 2 correct, empty question body, 201-character body, 101-character choice body. Each in its own `savepoint`;
- a quiz with a game: insert a game row as the owner, then `save_quiz_set` must raise, a direct delete must delete 0 rows, and a direct question insert must fail;
- a seed quiz (owner null) cannot be changed by the owner.

Run: `docker exec -i supabase_db_kahoot-alternative psql -U postgres -d postgres -v ON_ERROR_STOP=0 < /tmp/quiz_editor_checks.sql`

Expected: each case prints the result the spec requires. Read the full output.

- [ ] **Step 4: Regenerate types**

Run: `npx --yes supabase gen types typescript --local --schema public > src/types/supabase.ts`

If the CLI cannot run here, stop and report. Do not hand-edit `src/types/supabase.ts`.

Expected: the file contains `owner_user_id` on `quiz_sets` and `save_quiz_set` under `Functions`.

### Task 2: Email sign-in gate on the host dashboard

**Files:**
- Create: `src/app/host/dashboard/sign-in-gate.tsx` (client component)
- Modify: `src/app/host/dashboard/layout.tsx` (wrap `children` with the gate; add a "My quizzes" menu item linking to `/host/dashboard/quizzes`)
- Modify: `src/app/host/dashboard/page.tsx` (remove the `signInAnonymously` fallback in `startGame` and its unused `sessionError`)

**Interfaces:**
- Consumes: `supabase` from `@/types/types`, `Button`, `Notice`.
- Produces: `SignInGate({ children })`. Renders children only when the session exists and `user.is_anonymous` is false. Otherwise shows an email form that calls `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + '/host/dashboard' } })`, then "Check your email for the sign-in link".

- [ ] **Step 1: Write the gate**

On mount, call `getSession()`. Subscribe to `onAuthStateChange` to update state when the magic link is processed. Show a loading state until the first check completes.

- [ ] **Step 2: Wire the gate into the layout and remove the anonymous fallback**

- [ ] **Step 3: Check the flow in the browser**

Start the dev server (`npm run dev`), open `/host/dashboard`, and confirm the form appears. Request a link, then read the link from Inbucket at `http://127.0.0.1:54324` and open it. Expected: back on the dashboard, signed in as an email user.

### Task 3: Quiz list page

**Files:**
- Create: `src/app/host/dashboard/quizzes/page.tsx` (client)

**Interfaces:**
- Consumes: `QuizSet`, `supabase`, `Button`, `Notice`.
- Lists the signed-in user's quiz sets, using `from('quiz_sets').select('*, questions(id)').eq('owner_user_id', user.id).order('created_at', { ascending: false })`. Counts games per quiz with `from('games').select('quiz_set_id').in('quiz_set_id', ids)`. Each row shows the name, question count, and a status: "Draft" (0 questions), "Locked" (has games), or "Ready". Actions: "Edit" (not locked) or "View" (locked), "Duplicate", and "Delete" (not locked; confirm first with `window.confirm`). "New quiz" links to `/host/dashboard/quizzes/new`.
- Duplicate: call `save_quiz_set(null, name + ' (copy)', description, questions)`, where `questions` is built from the loaded quiz in the same order-and-body shape as the editor. Then open the new quiz.

- [ ] **Step 1: Write the page**
- [ ] **Step 2: Check it in the browser:** list, duplicate, delete.

### Task 4: Quiz editor

**Files:**
- Create: `src/app/host/dashboard/quizzes/quiz-editor.tsx` (client, shared by new and edit)
- Create: `src/app/host/dashboard/quizzes/new/page.tsx` (renders the editor with no id)
- Create: `src/app/host/dashboard/quizzes/[id]/page.tsx` (renders the editor with the id from `params`)

**Interfaces:**
- Consumes: `QuizSet`, `Question`, `supabase`, `Button`, `Notice`, and `save_quiz_set` from the regenerated types.
- `QuizEditor({ quizSetId?: string })`. Local state: `name`, `description`, `questions: { body: string; choices: { body: string; is_correct: boolean }[] }[]`, `locked`, `error`, `saving`.
- Load: when `quizSetId` is set, load with `from('quiz_sets').select('*, questions(*, choices(*))').eq('id', quizSetId).order('order', { ascending: true, referencedTable: 'questions' }).single()`. Set `locked` if any game references it. Sort the choices by `id`, as the game screens do. Check the current game code for the order.
- Editing rules: add and remove question; move question up and down; add choice (max 4); remove choice (min 2); mark one choice correct (radio, exactly one). Show character counts (200 and 100).
- Validation runs before save and mirrors the database rules. Errors come from the database too, so show the database message in `Notice`.
- Save: call `supabase.rpc('save_quiz_set', { p_id: quizSetId ?? null, p_name, p_description, p_questions })`. On success with a new quiz, `router.replace('/host/dashboard/quizzes/' + id)`.
- Locked: all inputs disabled, with a `Notice`-style message: "This quiz has games and cannot be changed. Duplicate it to make changes."
- Use `answer-N` colours only in the game screens. The editor uses the plain card and button styles from `globals.css`.

- [ ] **Step 1: Write the editor and the two route pages**
- [ ] **Step 2: Check in the browser:** create a quiz with 2 questions, 2 and 4 choices. Test each validation. Edit it. Confirm the locked view for a quiz that has a game (start one from the dashboard).

### Task 5: Nav and final checks

- [ ] **Step 1: Run `npm run lint`.** Expected: no new errors in the touched files.
- [ ] **Step 2: Run `npm run build`.** Expected: build succeeds with `.env.local` present. The build from Vercel needs the env vars, as before.
- [ ] **Step 3: Full browser pass:** sign in, create, edit, duplicate, delete, start a game, confirm a played quiz is locked.
- [ ] **Step 4: Summarise** what passed, what was not checked, and the open items (hosted migration, hosted redirect URL, SMTP).
