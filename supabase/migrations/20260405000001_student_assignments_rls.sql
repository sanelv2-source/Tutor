drop policy if exists "Students can view own assignments" on public.assignments;

create policy "Students can view own assignments"
on public.assignments
for select
to authenticated
using (
  student_id in (
    select id from public.students where profile_id = auth.uid()
  )
);
