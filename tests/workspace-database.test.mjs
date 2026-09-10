import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const admin = '10000000-0000-4000-8000-000000000001';
const workerA = '20000000-0000-4000-8000-000000000001';
const workerB = '20000000-0000-4000-8000-000000000002';
const developer = '30000000-0000-4000-8000-000000000001';

test('workspace migrations, real Postgres RLS and report snapshots', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
    create schema storage;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated;
    grant select, insert, delete on storage.objects to authenticated;
  `);
  for (const file of ['20260907120000_auth_identity.sql', '20260910130000_workspace_data.sql', '20260910131000_student_storage.sql', '20260910150000_advisor_hardening.sql', '20260911090000_archive_and_open_date.sql']) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  }
  for (const [id, role, name] of [[admin,'admin','Owner'],[workerA,'staff','Worker A'],[workerB,'staff','Worker B'],[developer,'superadmin','Developer']]) {
    await db.query('insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values($1,$2,$3,$4)',
      [id, `${name.replaceAll(' ', '').toLowerCase()}@example.test`, {role}, {full_name:name}]);
  }
  async function as(id, action) {
    await db.exec('set role authenticated');
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
    try { return await action(); }
    finally { await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub', '', false)"); }
  }
  const scalar = async (sql, params = []) => Object.values((await db.query(sql, params)).rows[0])[0];
  let shared, unassigned, application, otherApplication, submitted, awarded;

  await t.test('new tables are protected and no placeholder statuses are seeded', async () => {
    assert.equal(await scalar('select count(*) from public.workflow_statuses'), 0);
    assert.equal(await scalar(`select count(*) from pg_tables where schemaname='public' and tablename in
      ('worker_details','workflow_statuses','students','student_staff_assignments','university_applications','application_history','student_notes','student_documents','yearly_reports') and rowsecurity`), 9);
    await db.exec('set role anon');
    await assert.rejects(db.query('select * from public.students'), /permission denied/);
    await db.exec('reset role');
    shared = await as(admin, () => scalar("select public.create_student('Shared Student','','','2026-01-01',$1::uuid[])", [[workerA, workerB]]));
    unassigned = await as(admin, () => scalar("select public.create_student('Unassigned Student','','','2026-01-01','{}')"));
    submitted = await as(admin, () => scalar("select public.add_workflow_status('application','Sent to university',true,false)"));
    awarded = await as(admin, () => scalar("select public.add_workflow_status('scholarship','Funding confirmed',false,true)"));
    application = await as(workerA, () => scalar("insert into public.university_applications(student_id,university_name) values($1,'Example University') returning id", [shared]));
    otherApplication = await as(admin, () => scalar("insert into public.university_applications(student_id,university_name) values($1,'Other University') returning id", [unassigned]));
  });

  await t.test('both assigned workers can read the shared file, applications and history only', async () => {
    for (const worker of [workerA, workerB]) await as(worker, async () => {
      assert.deepEqual((await db.query('select id from public.students')).rows.map(r => r.id), [shared]);
      assert.deepEqual((await db.query('select id from public.university_applications')).rows.map(r => r.id), [application]);
      assert.equal(await scalar('select count(*) from public.application_history'), 1);
      assert.equal(await scalar('select count(*) from public.profiles'), 1, 'co-assigned worker identities remain private');
      assert.equal(await scalar('select count(*) from public.yearly_reports'), 0);
      assert.equal((await db.query("update public.students set full_name='Should not change' where id=$1",[unassigned])).affectedRows, 0);
      assert.equal((await db.query("update public.university_applications set decision_status='accepted' where id=$1",[otherApplication])).affectedRows, 0);
      await assert.rejects(db.query("insert into public.university_applications(student_id,university_name) values($1,'Blocked')",[unassigned]), /row-level security/);
      await assert.rejects(db.query('select public.set_student_workers($1,$2::uuid[])',[unassigned,[worker]]), /Only an admin/);
      await assert.rejects(db.query("update public.profiles set role='admin' where id=$1",[worker]), /permission denied/);
      await assert.rejects(db.query("update public.profiles set status='inactive' where id=$1",[worker]), /permission denied/);
    });
    assert.equal(await as(developer, () => scalar('select count(*) from public.students')), 2);
  });

  await t.test('writes record the authenticated actor, protect history and validate workflow categories', async () => {
    await as(workerA, async () => {
      await db.query('update public.university_applications set application_status_id=$1 where id=$2',[submitted,application]);
      assert.equal(await scalar('select is_submitted from public.university_applications where id=$1',[application]), true);
      assert.equal(await scalar("select actor_id from public.application_history where application_id=$1 order by occurred_at desc limit 1",[application]), workerA);
      await assert.rejects(db.query('update public.university_applications set student_id=$1 where id=$2',[unassigned,application]), /permission denied/);
      await assert.rejects(db.query('update public.university_applications set is_awarded=true where id=$1',[application]), /permission denied/);
      await assert.rejects(db.query('delete from public.application_history'), /permission denied/);
      await assert.rejects(db.query('update public.university_applications set application_status_id=$1 where id=$2',[awarded,application]), /Choose an application status/);
      await assert.rejects(db.query('update public.university_applications set admission_confirmed=true where id=$1',[application]), /check constraint/);
      await db.query('insert into public.student_notes(student_id,body) values($1,$2)',[shared,'A real note']);
      await assert.rejects(db.query('insert into public.student_notes(student_id,body) values($1,$2)',[unassigned,'Blocked note']), /row-level security/);
    });
  });

  await t.test('deactivation immediately revokes database access and preserves assignments', async () => {
    await as(admin, () => db.query("select public.save_worker($1,'Worker A','123','2026-01-01','2026-06-30','inactive')",[workerA]));
    await as(workerA, async () => {
      for (const table of ['students','university_applications','student_notes','application_history','student_staff_assignments','worker_details']) {
        assert.equal(await scalar(`select count(*) from public.${table}`), 0, `${table} must be inaccessible`);
      }
      await assert.rejects(db.query('insert into public.student_notes(student_id,body) values($1,$2)',[shared,'Blocked after departure']), /row-level security/);
    });
    assert.equal(await scalar('select count(*) from public.student_staff_assignments where worker_id=$1 and ended_at is null',[workerA]), 1);
    await as(admin, () => db.query("select public.save_worker($1,'Worker A','123','2026-01-01',null,'active')",[workerA]));
  });

  await t.test('assignment changes are atomic, retain history and stop access after removal', async () => {
    await as(admin, async () => {
      await assert.rejects(db.query('select public.set_student_workers($1,$2::uuid[])',[shared,[admin]]), /active staff/);
      assert.equal(await scalar('select count(*) from public.student_staff_assignments where student_id=$1 and ended_at is null',[shared]), 2);
      await db.query('select public.set_student_workers($1,$2::uuid[])',[shared,[workerB]]);
    });
    assert.equal(await as(workerA, () => scalar('select count(*) from public.students')), 0);
    assert.equal(await as(workerB, () => scalar('select count(*) from public.students')), 1);
    assert.equal(await scalar('select count(*) from public.student_staff_assignments where student_id=$1',[shared]), 2);
    await as(admin, () => db.query('select public.set_student_workers($1,$2::uuid[])',[shared,[workerA,workerB]]));
  });

  await t.test('storage policies reject another student, anonymous access and malformed paths', async () => {
    await as(workerA, async () => {
      await db.query("insert into storage.objects(bucket_id,name) values('student-documents',$1)",[`${shared}/sample.pdf`]);
      await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('student-documents',$1)",[`${unassigned}/sample.pdf`]), /row-level security/);
      assert.equal(await scalar("select public.can_access_student_object('malformed/file.pdf')"), false);
      await db.query("insert into public.student_documents(student_id,name,storage_path,mime_type,size_bytes) values($1,'sample.pdf',$2,'application/pdf',100)",[shared,`${shared}/sample.pdf`]);
      assert.equal((await db.query('delete from storage.objects where name=$1',[`${shared}/sample.pdf`])).affectedRows, 0, 'linked documents cannot be removed');
    });
    await as(admin, () => db.query('select public.set_student_workers($1,$2::uuid[])',[shared,[workerB]]));
    assert.equal(await as(workerA, () => scalar('select count(*) from storage.objects')), 0);
    assert.equal(await as(workerA, () => scalar('select count(*) from public.student_documents')), 0);
    await as(admin, () => db.query('select public.set_student_workers($1,$2::uuid[])',[shared,[workerA,workerB]]));
  });

  await t.test('year boundaries, deduplication, immutable approvals, versioning and admin-only reports', async () => {
    // Move test history as the DB owner only to exercise exact UTC boundaries.
    // Application users have no grant to change these timestamps.
    await db.query("update public.application_history set occurred_at='2026-12-31T23:59:59Z' where application_id=$1",[application]);
    await as(workerA, () => db.query("update public.university_applications set decision_status='accepted' where id=$1",[application]));
    await db.query("update public.application_history set occurred_at='2027-01-01T00:00:00Z' where application_id=$1 and after_data->>'decision_status'='accepted'",[application]);
    await db.query("update public.student_staff_assignments set assigned_at='2026-01-01T00:00:00Z' where ended_at is null");
    const r2026 = await as(admin, () => scalar("select public.create_yearly_report('2026','2026-01-01','2026-12-31')"));
    const r2027 = await as(admin, () => scalar("select public.create_yearly_report('2027','2027-01-01','2027-12-31')"));
    const oldReport = (await db.query('select * from public.yearly_reports where id=$1',[r2026])).rows[0];
    assert.equal(oldReport.payload.applications_submitted, 1);
    assert.equal(oldReport.payload.offers_received, 0);
    assert.equal(oldReport.payload.students_handled, 1, 'shared student counts once at company level');
    assert.equal(oldReport.payload.workers.filter(w => w.students_handled === 1).length, 2);
    assert.equal(await scalar("select (payload->>'offers_received')::int from public.yearly_reports where id=$1",[r2027]), 1);
    await as(workerA, async () => {
      assert.equal(await scalar('select count(*) from public.yearly_reports'), 0);
      await assert.rejects(db.query("select public.create_yearly_report('Denied','2026-01-01','2026-12-31')"), /Only an admin/);
      await assert.rejects(db.query('select public.approve_yearly_report($1,$2)',[r2026,oldReport.generated_at]), /Only an admin/);
    });
    await as(admin, async () => {
      await assert.rejects(db.query('select public.approve_yearly_report($1,$2)',[r2026,'2000-01-01T00:00:00Z']), /changed or was already approved/);
      await db.query('select public.approve_yearly_report($1,$2)',[r2026,oldReport.generated_at]);
      await assert.rejects(db.query('select public.refresh_yearly_report($1)',[r2026]), /Only draft/);
      await assert.rejects(db.query("update public.yearly_reports set payload='{}' where id=$1",[r2026]), /permission denied/);
      await assert.rejects(db.query('delete from public.yearly_reports where id=$1',[r2026]), /permission denied/);
    });
    await as(workerA, () => db.query('update public.university_applications set scholarship_status_id=$1 where id=$2',[awarded,application]));
    assert.deepEqual(await scalar('select payload from public.yearly_reports where id=$1',[r2026]), oldReport.payload);
    const revision = await as(admin, () => scalar("select public.create_yearly_report('2026 corrected','2026-01-01','2026-12-31')"));
    assert.equal(await scalar('select version from public.yearly_reports where id=$1',[revision]), 2);
    await as(admin, () => db.query('select public.refresh_yearly_report($1)',[revision]));
  });

  await t.test('only an admin changes the file-opened date', async () => {
    await as(workerA, async () => {
      await assert.rejects(db.query("update public.students set file_opened_at='2025-06-01' where id=$1",[shared]), /Only an admin can change the file-opened date/);
      await db.query("update public.students set full_name='Shared Student', file_opened_at=file_opened_at where id=$1",[shared]);
    });
    await as(admin, () => db.query("update public.students set file_opened_at='2026-01-02' where id=$1",[shared]));
    assert.equal(await scalar("select file_opened_at::text from public.students where id=$1",[shared]), '2026-01-02');
  });

  await t.test('archiving hides records from staff and new reports, keeps them for admins, and restores', async () => {
    const historyBefore = await scalar('select count(*) from public.application_history');
    const note = await scalar('select id from public.student_notes where student_id=$1 limit 1',[shared]);
    const doc = await scalar('select id from public.student_documents where student_id=$1 limit 1',[shared]);
    const before2026 = await as(admin, () => scalar("select public.create_yearly_report('2026 pre-archive','2026-01-01','2026-12-31')"));
    const approvedBefore = await scalar('select payload from public.yearly_reports where approved_at is not null limit 1');
    await as(workerA, () => assert.rejects(db.query("select public.set_archived('application',$1,true)",[application]), /Only an admin/));

    await as(admin, async () => {
      for (const [kind, id] of [['application', application], ['note', note], ['document', doc]]) await db.query('select public.set_archived($1,$2,true)',[kind,id]);
      await assert.rejects(db.query("select public.set_archived('note',$1,true)",[note]), /already changed/);
      assert.equal(await scalar('select count(*) from public.university_applications where id=$1',[application]), 1, 'admin still sees archived rows');
    });
    assert.equal(await scalar('select count(*) from public.application_history'), historyBefore, 'archiving writes no history');
    await as(workerA, async () => {
      assert.equal(await scalar('select count(*) from public.university_applications'), 0);
      assert.equal(await scalar('select count(*) from public.application_history'), 0);
      assert.equal(await scalar('select count(*) from public.student_notes'), 0);
      assert.equal(await scalar('select count(*) from public.student_documents'), 0);
      assert.equal(await scalar('select count(*) from storage.objects'), 0, 'archived document file is not downloadable');
      assert.equal((await db.query("update public.university_applications set decision_status='rejected' where id=$1",[application])).affectedRows, 0);
    });
    const after2026 = await as(admin, () => scalar("select public.create_yearly_report('2026 post-archive','2026-01-01','2026-12-31')"));
    assert.equal(await scalar("select (payload->>'applications_submitted')::int from public.yearly_reports where id=$1",[before2026]), 1);
    assert.equal(await scalar("select (payload->>'applications_submitted')::int from public.yearly_reports where id=$1",[after2026]), 0);
    assert.deepEqual(await scalar('select payload from public.yearly_reports where approved_at is not null limit 1'), approvedBefore, 'approved snapshot unchanged');

    await as(admin, async () => {
      await db.query("select public.set_archived('student',$1,true)",[shared]);
      await assert.rejects(db.query("insert into public.university_applications(student_id,university_name) values($1,'Blocked')",[shared]), /row-level security/);
      assert.equal((await db.query("update public.students set phone='1' where id=$1",[shared])).affectedRows, 0, 'archived file is read-only');
    });
    await as(workerB, async () => {
      assert.equal(await scalar('select count(*) from public.students'), 0);
      await assert.rejects(db.query('insert into public.student_notes(student_id,body) values($1,$2)',[shared,'Blocked']), /row-level security/);
    });
    assert.equal(await as(admin, () => scalar("select (public.create_yearly_report('2026 file archived','2026-01-01','2026-12-31'))::text")) !== null, true);
    assert.equal(await scalar("select (payload->>'new_students')::int from public.yearly_reports where label='2026 file archived'"), 1, 'only the unassigned file remains new');

    await as(admin, async () => {
      for (const [kind, id] of [['student', shared], ['application', application], ['note', note], ['document', doc]]) await db.query('select public.set_archived($1,$2,false)',[kind,id]);
    });
    await as(workerB, async () => {
      assert.equal(await scalar('select count(*) from public.students'), 1);
      assert.equal(await scalar('select count(*) from public.university_applications'), 1);
      assert.equal(await scalar('select count(*) from public.student_documents'), 1);
      assert.equal(await scalar('select count(*) from storage.objects'), 1);
    });
  });
});
