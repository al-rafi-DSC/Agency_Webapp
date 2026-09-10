# Worker, Student and Yearly Summary setup

The approved design uses **one existing Supabase database**, with three linked
sections. Nothing in these migrations creates a second project or changes DNS,
hosting, existing account roles, or passwords.

## Apply in order

1. The existing identity migration must already be applied:
   `migrations/20260907120000_auth_identity.sql`.
2. Run `migrations/20260910130000_workspace_data.sql` in the Supabase SQL Editor.
3. Run `migrations/20260910131000_student_storage.sql` in the SQL Editor.
4. Run `migrations/20260910150000_advisor_hardening.sql` in the SQL Editor. It
   answers the Supabase security/performance advisors without changing access.
5. Run `migrations/20260911090000_archive_and_open_date.sql` in the SQL Editor
   (archiving and the admin-only file-opened date — see below).

**Hosted status:** all five migrations are applied to the `Agency_Webapp`
project (`hqyavenqhutmbiiusrhz`) as of 2026-09-11 and pass the check below.

The new migrations are transactional, additive migrations, intended to run
once. They create empty tables and policies; they do not upload sample people.
With an authenticated, linked Supabase CLI, `supabase db push` applies them in
order instead. Do not rerun a migration already recorded as applied.

After applying, run this read-only check in the SQL Editor:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'worker_details', 'workflow_statuses', 'students',
    'student_staff_assignments', 'university_applications',
    'application_history', 'student_notes', 'student_documents', 'yearly_reports'
  )
order by tablename;
```

Expect nine rows, all with `rowsecurity = true`. The existing `profiles` table
is shared by the three sections. Check that the `student-documents` storage
bucket is private.

## Start using real records

- Keep the project's existing Supabase public URL and publishable key.
- Set `NEXT_PUBLIC_UI_PREVIEW=false` in the local environment, then restart the
  dev server. Production always disables preview. No `.env` file is committed.
- Sign in as the existing Admin. The owner must already have an Admin profile;
  the existing bootstrap instructions still apply to a fresh Supabase project.
- Invite workers from **Workers**. Invitations still require the existing
  server-only Supabase secret key and configured SMTP. Enter credentials only
  in your local environment / Vercel / Supabase settings, never in source code.
- Open a worker to set their phone number, joining/leaving dates and status.
- In **Settings**, add your own application and scholarship labels. Mark the
  labels that mean submitted / awarded so dashboards and reports can count
  milestones without depending on wording. No illustrative status vocabulary
  is seeded. Archive a label to stop using it for new changes while preserving
  existing applications and history.
- Open a student file and select zero, one, or several active workers. Add
  university applications, edit contact details, add notes, and upload documents.
- In **Yearly summary**, choose a label and explicit start/end dates. Review the
  draft, refresh if needed, then approve. Corrections create a new version.

## Tables and permissions

| Section | Tables | Access |
| --- | --- | --- |
| Worker | existing `profiles`, new `worker_details` | Admin sees staff; staff see their own profile/details |
| Student | `students`, `student_staff_assignments`, `university_applications`, `application_history`, `student_notes`, `student_documents` | Admin sees all; staff can access only currently assigned students |
| Yearly Summary | `yearly_reports` | Admin / Superadmin only |
| Shared vocabulary | `workflow_statuses` | Active users read; Admin manages through checked RPCs |

Normal record reads/writes use the signed-in Supabase client, never the secret
key. Database policies protect both reads and writes. Admin-only RPCs validate
the caller inside Postgres. An inactive account immediately loses student,
document, reporting, and workflow access, even with an unexpired access token.
Changing a worker to inactive preserves assignments and surfaces the affected
files on the Admin dashboard. This is app/database deactivation; it does not
delete the Supabase Auth identity.

**Nothing is deleted; an Admin archives instead** (owner decision, 2026-09-11).
Student files, applications, notes and documents can be archived and restored
through `set_archived()`, which only an Admin can call. An archived record stays
in the database but staff can no longer see it (including an archived
document's file), nobody can edit it, and it disappears from lists, dashboards
and new report drafts. An archived student file is read-only for everyone until
restored. Archiving writes no application history, and approved report
snapshots never change. Admins restore from the student page or from
**Students → Archived student files**.

**Only an Admin can change a student's file-opened date**, because that date
decides the reporting year a student counts as new. Staff still edit name,
email, phone and photo; a trigger rejects a non-admin date change.

Assignment records retain start/end timestamps. Removing a current assignment
ends it; assigning the worker again creates another history row. A failed
assignment change rolls back the whole operation, including student creation.
Co-assigned staff names remain private to staff accounts; this preserves the
existing strict profile policy until that visibility question is resolved.

Documents are private PDFs, JPEGs, PNGs or WebP files up to **4 MB**. The cap
leaves multipart overhead below Vercel's 4.5 MB function request limit:
https://vercel.com/docs/functions/limitations. Downloads check the current
session and database/storage permissions each time and return attachments with
`Cache-Control: private, no-store`. File extensions are generated from checked
file signatures. No executable/HTML/SVG uploads or public download URLs are used.
Student photos currently accept an optional HTTPS image URL.

## What yearly totals mean

- Both period dates are inclusive, in UTC.
- New student files use the file-opening date.
- Archived student files and archived applications are left out of new drafts.
- Students handled means unique students with an assignment overlapping the
  period. Shared students count once in the company total, but can appear in
  multiple worker rows. A wholly unassigned file contributes to new files, not
  students handled.
- Submissions, offers, rejections, admissions and scholarship awards count
  distinct application IDs that reached the milestone during the period.
- Milestone dates are when the changes were recorded in this workspace. An
  application first recorded today is not retroactively assigned an event date
  from a previous year. Historical imports/backdated events need a separate,
  explicitly designed import process.
- Application history is written by database triggers and cannot be edited by
  application users. A repeated milestone counts once per application/category
  within a reporting period. An application can have both an offer and a later
  rejection recorded; those totals describe events, not mutually exclusive
  final outcomes.
- Worker application counts show which applications the worker actually
  updated, not credit for outcomes. Outcome attribution for shared/reassigned
  files remains undecided.
- University names are free text, so consistent spelling matters for grouping.
- Drafts are snapshots and refresh on request. Approval preserves exactly the
  viewed snapshot; stale approvals are rejected. Approved reports cannot be
  edited/deleted/refreshed by app users. New versions retain earlier versions.

## Verification

`npm run test:database` runs the actual migrations in PGlite (Postgres in WASM)
with separate authenticated roles. Supabase-managed `auth` and `storage` tables
are represented by minimal test fixtures. Tests exercise student isolation,
shared assignments, inactive accounts, protected columns, atomic assignment
changes, document policies, UTC year boundaries, deduplicated counts, report
permissions, stale approvals, immutable approved snapshots, archiving and
restoring, and the admin-only file-opened date.

This verifies SQL and policies locally, not the hosted Supabase project's
current schema, Auth configuration, SMTP delivery or Storage service. After
applying the migrations, verify one invitation, one saved student/application,
one document upload/download and one draft/approved report in the connected app.
