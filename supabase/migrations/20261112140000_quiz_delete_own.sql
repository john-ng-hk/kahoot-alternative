-- Owners can delete any of their quiz sets, including ones that have been played.
-- Deleting a quiz also deletes its games, participants, answers and results (ON DELETE CASCADE).
drop policy "Owners can delete unplayed quiz sets" on public.quiz_sets;

create policy "Owners can delete quiz sets" on public.quiz_sets
  for delete using (owner_user_id = auth.uid() and public.is_email_user());
