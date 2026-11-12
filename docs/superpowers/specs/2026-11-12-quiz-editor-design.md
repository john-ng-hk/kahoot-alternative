# Quiz Editor Design

Status: draft, awaiting approval. Phase 2, after the UI revamp (`2026-11-12-ui-revamp-design.md`).

## Intent

Hosts create and edit their own quizzes in the app. Today this needs SQL (`supabase/seed.sql`, `add_question`).

## Goals

- A host signs in with email, then creates quiz sets, questions and choices in the browser.
- Each quiz has one owner. Only the owner can change or delete it.
- Each save is all or nothing. A quiz is never saved half-written.

## Non-goals (v1)

- Editing seed quizzes or quizzes owned by other hosts.
- Images, per-question timers, or question types other than multiple choice.
- Drag-and-drop ordering. Use up and down buttons.
- Sharing quizzes between hosts.

## Anti-goals

- A save that leaves a quiz with an invalid question, such as no correct answer.
- Results of a played game changing because the quiz was edited.

## Agreed decisions

- Only the owner can edit a quiz. Hosts sign in with email.
- Full create, edit and delete for quiz sets, questions and choices.
- Each question has 2 to 4 choices, and exactly one choice is correct.

## Design decisions (our call, for review)

- **Sign-in:** email magic link via `signInWithOtp`. No passwords.
- **Host dashboard requires email sign-in.** Players stay anonymous, as now.
- **Anonymous sessions cannot own quizzes.** RLS checks the JWT claim: `(auth.jwt() ->> 'is_anonymous')::boolean = false`, as well as `owner_user_id = auth.uid()`. Checking only in the UI is not enough.
- **Switching from anonymous to email replaces the session.** Past games keep their old anonymous `host_user_id`. We do not link identities, because linking needs an email change confirmation. Cost: nothing in the app lists past games by host, so no view breaks.
- **Ownership:** `quiz_sets.owner_user_id uuid references auth.users(id) on delete set null default auth.uid()`. Seed and existing quizzes have no owner, so they are read-only in the editor.
- **RLS:**
  - `quiz_sets` insert and update: only when the owner is the caller, and the caller is not anonymous.
  - `quiz_sets` delete: only when the owner is the caller and no game references the quiz set.
  - `questions` and `choices` insert, update and delete: only when the parent quiz set's owner is the caller, and the caller is not anonymous.
  - Existing public select policies stay.
- **Atomic save:** one Postgres function, `save_quiz_set(quiz_set_id uuid, name text, description text, questions jsonb)`, `security invoker`.
  - With an id, it updates the quiz set. With a null id, it creates one and returns the new id.
  - It runs in one transaction. It starts with `select ... for update` on the quiz set row. A foreign key insert from a new game takes a conflicting lock, so a game cannot start between the check and the save.
  - It raises an error if any game references the quiz set. Otherwise it deletes the quiz set's questions and choices and inserts the new ones. Choices get new ids. This is safe because a quiz with games is never saved.
  - `questions.order` is the array position, starting at 0. The table has no unique constraint on `order`, so none is needed.
  - It checks:
    - name is not empty;
    - question body is 1 to 200 characters;
    - choice body is 1 to 100 characters;
    - each question has 2 to 4 choices;
    - each question has exactly one correct choice.
  - Any failure raises an error and nothing is written.
- **Quizzes with games are locked.** The editor shows them as read-only, with no edit or delete. The database enforces this, not only the UI. Reason: deleting a quiz cascades to its games and results. Replacing choices sets `answers.choice_id` to null, which would change played results.
- **Zero questions is allowed.** A quiz can be saved as a draft. The dashboard keeps Start Game disabled, as now.
- **Start Game lists all quizzes, as now.** Other hosts' drafts stay visible. The `quiz_sets` select policy is already public, so hiding them would not hide them from the database anyway.
- **Routes:**
  - `/host/dashboard/quizzes`: list of the host's quizzes, with a "New quiz" button.
  - `/host/dashboard/quizzes/new` and `/host/dashboard/quizzes/[id]`: editor. Creating a quiz redirects to its `[id]` page.
  - Add a "My quizzes" item to the dashboard nav.
- **Migration:** `supabase/migrations/<timestamp>_quiz_editor.sql`. Regenerate `src/types/supabase.ts` after it runs.
- **Auth redirect:** the magic link returns to `/host/dashboard`. Add the production domain to `additional_redirect_urls` before release.

## Known limits

- A host signed in by email who opens a player link in the same browser plays as the host user. The same applies to anonymous sessions today.
- Hosted Supabase's built-in email sender is rate-limited. Real use needs custom SMTP. Local development reads emails in Inbucket.
- Existing anonymous host sessions cannot edit anything. The host signs in with email once.

## Verification

- Apply the migration to the local stack.
- SQL checks:
  - an anonymous user cannot create or edit a quiz, even if `owner_user_id` is set to their id;
  - a non-owner cannot insert, update or delete a quiz set, its questions or its choices;
  - the owner can;
  - a seed quiz cannot be changed;
  - a quiz with a game cannot be deleted, and `save_quiz_set` refuses to change it;
  - `save_quiz_set` rejects 1 choice, 5 choices, 0 correct, 2 correct, an empty body, and a body over the length limit.
- Browser checks: sign in, create a quiz, edit, reorder, delete, start a game. Also check that a quiz with games is read-only.
- `npm run lint` and `npm run build` pass.
- The regenerated types match the schema.

## Open questions

1. Quizzes with games: locked (recommended), or allowed with a warning that results will change?
2. Email: built-in sender for now (recommended for local work), or set up custom SMTP before release?
3. Add "Duplicate quiz" in v1? It is small, and it is the only way to change a quiz that has games. Recommended: yes.
