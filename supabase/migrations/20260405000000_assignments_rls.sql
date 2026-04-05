drop policy if exists "Tutors can view own assignments" on public.assignments;
drop policy if exists "Tutors can insert own assignments" on public.assignments;
drop policy if exists "Tutors can update own assignments" on public.assignments;

create policy "Tutors can view own assignments"
on public.assignments
for select
to authenticated
using (tutor_id = auth.uid());

create policy "Tutors can insert own assignments"
on public.assignments
for insert
to authenticated
with check (tutor_id = auth.uid());

create policy "Tutors can update own assignments"
on public.assignments
for update
to authenticated
using (tutor_id = auth.uid())
with check (tutor_id = auth.uid());
