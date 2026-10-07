-- Owner request, 2026-10-07: a student file carries two Drive links.
--   1. Main Drive Link — the existing drive_link column. Only an admin sets or
--      changes it (trigger guard_drive_link); assigned staff can open it.
--   2. Student Drive Link — new. Admin or any staff assigned to the file can
--      paste or change it. Same row access as every other student field: the
--      students UPDATE policy (can_write_student) already limits writes to
--      admins and assigned staff, and refuses everyone on a closed file.
--
-- Additive. Apply before deploying the app code that reads student_drive_link.
begin;

alter table public.students
  add column student_drive_link text
    check (student_drive_link ~ '^https://[^\s]+$' and length(student_drive_link) <= 2048);

grant update (student_drive_link) on public.students to authenticated;

commit;
