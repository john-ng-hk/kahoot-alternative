-- Quiz editor: quiz ownership, owner-only RLS, and an atomic save function.

alter table public.quiz_sets
  add column owner_user_id uuid references auth.users(id) on delete set null;

-- Set the default after adding the column, so existing and seed rows stay without an owner.
alter table public.quiz_sets
  alter column owner_user_id set default auth.uid();

-- True for a signed-in user who is not anonymous. Missing claim counts as anonymous.
create or replace function public.is_email_user() returns boolean
language sql stable as $$
  select auth.uid() is not null
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, true) = false;
$$;

-- True when the caller is an email user, owns the quiz set, and no game uses it.
create or replace function public.can_edit_quiz(quiz_set_id uuid) returns boolean
language sql stable as $$
  select public.is_email_user()
    and exists (
      select 1 from public.quiz_sets qs
      where qs.id = can_edit_quiz.quiz_set_id
        and qs.owner_user_id = auth.uid()
    )
    and not exists (
      select 1 from public.games g
      where g.quiz_set_id = can_edit_quiz.quiz_set_id
    );
$$;

create policy "Owners can create quiz sets" on public.quiz_sets
  for insert with check (owner_user_id = auth.uid() and public.is_email_user());
create policy "Owners can update unplayed quiz sets" on public.quiz_sets
  for update using (public.can_edit_quiz(id)) with check (public.can_edit_quiz(id));
create policy "Owners can delete unplayed quiz sets" on public.quiz_sets
  for delete using (public.can_edit_quiz(id));

create policy "Owners can insert questions" on public.questions
  for insert with check (public.can_edit_quiz(quiz_set_id));
create policy "Owners can update questions" on public.questions
  for update using (public.can_edit_quiz(quiz_set_id)) with check (public.can_edit_quiz(quiz_set_id));
create policy "Owners can delete questions" on public.questions
  for delete using (public.can_edit_quiz(quiz_set_id));

create policy "Owners can insert choices" on public.choices
  for insert with check (
    public.can_edit_quiz((select q.quiz_set_id from public.questions q where q.id = choices.question_id))
  );
create policy "Owners can update choices" on public.choices
  for update using (
    public.can_edit_quiz((select q.quiz_set_id from public.questions q where q.id = choices.question_id))
  ) with check (
    public.can_edit_quiz((select q.quiz_set_id from public.questions q where q.id = choices.question_id))
  );
create policy "Owners can delete choices" on public.choices
  for delete using (
    public.can_edit_quiz((select q.quiz_set_id from public.questions q where q.id = choices.question_id))
  );

-- Writes a whole quiz in one transaction. p_id null creates a quiz set.
-- p_questions: [{"body": "...", "choices": [{"body": "...", "is_correct": true}, ...]}, ...]
-- Question order is the array position, starting at 0.
create or replace function public.save_quiz_set(
  p_id uuid,
  p_name text,
  p_description text,
  p_questions jsonb
) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid := p_id;
  q jsonb;
  c jsonb;
  qid uuid;
  i int := 0;
  n_choices int;
  n_correct int;
begin
  if p_name is null or btrim(p_name) = '' then
    raise exception 'Quiz name is required';
  end if;
  if jsonb_typeof(p_questions) <> 'array' then
    raise exception 'Questions must be a list';
  end if;

  if v_id is null then
    insert into public.quiz_sets (name, description)
      values (btrim(p_name), p_description)
      returning id into v_id;
  else
    -- Row lock: a game cannot reference this quiz set until this transaction ends.
    perform 1 from public.quiz_sets where id = v_id for update;
    if not found then
      raise exception 'Quiz not found';
    end if;
    if not public.can_edit_quiz(v_id) then
      raise exception 'This quiz cannot be changed';
    end if;
    update public.quiz_sets
      set name = btrim(p_name), description = p_description
      where id = v_id;
    -- Choices cascade from questions.
    delete from public.questions where quiz_set_id = v_id;
  end if;

  for q in select t.value from jsonb_array_elements(p_questions) with ordinality as t(value, ord) order by t.ord
  loop
    if length(btrim(coalesce(q->>'body', ''))) not between 1 and 200 then
      raise exception 'Question % must have 1 to 200 characters', i + 1;
    end if;
    c := q->'choices';
    if jsonb_typeof(c) <> 'array' then
      raise exception 'Question % must have a list of choices', i + 1;
    end if;
    n_choices := jsonb_array_length(c);
    if n_choices not between 2 and 4 then
      raise exception 'Question % must have 2 to 4 choices', i + 1;
    end if;
    if exists (
      select 1 from jsonb_array_elements(c) x
      where length(btrim(coalesce(x->>'body', ''))) not between 1 and 100
    ) then
      raise exception 'Every choice in question % must have 1 to 100 characters', i + 1;
    end if;
    select count(*) filter (where (x->>'is_correct')::boolean)
      into n_correct
      from jsonb_array_elements(c) x;
    if n_correct <> 1 then
      raise exception 'Question % must have exactly one correct choice', i + 1;
    end if;

    insert into public.questions (quiz_set_id, body, "order")
      values (v_id, btrim(q->>'body'), i)
      returning id into qid;
    -- created_at steps by 1 ms per choice, so the author's order survives later reads.
    insert into public.choices (question_id, body, is_correct, created_at)
      select qid, btrim(x.value->>'body'), (x.value->>'is_correct')::boolean,
             now() + (x.ord * interval '1 millisecond')
      from jsonb_array_elements(c) with ordinality as x(value, ord);

    i := i + 1;
  end loop;

  return v_id;
end;
$$;

grant execute on function public.save_quiz_set(uuid, text, text, jsonb) to anon, authenticated;
