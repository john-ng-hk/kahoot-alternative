-- Quiz owners can delete the games of their own quizzes, whoever hosted them.
-- A quiz with games cannot be edited, so this is how an owner unlocks it.
-- Deleting a game also deletes its participants, answers and results (ON DELETE CASCADE).
create policy "Quiz owners can delete games of their quizzes" on public.games
  for delete using (
    public.is_email_user()
    and exists (
      select 1 from public.quiz_sets qs
      where qs.id = games.quiz_set_id
        and qs.owner_user_id = auth.uid()
    )
  );
