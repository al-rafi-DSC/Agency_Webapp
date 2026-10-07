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
  for (const file of ['20260907120000_auth_identity.sql', '20260910130000_workspace_data.sql', '20260910131000_student_storage.sql', '20260910150000_advisor_hardening.sql', '20260911090000_archive_and_open_date.sql', '20260930100000_staff_registrations.sql', '20260930140000_student_submissions.sql', '20261004120000_student_file_details.sql', '20261004160000_applications_and_closing.sql', '20261005100000_note_priority.sql', '20261007100000_staff_open_student_file.sql']) {
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

  await t.test('new tables are protected and only the owner-confirmed statuses are seeded', async () => {
    assert.deepEqual((await db.query("select category || ':' || label || ':' || counts_as_submitted || ':' || counts_as_awarded as s from public.workflow_statuses order by category, created_at, label")).rows.map(r => r.s).sort(), [
      'application:Complete:true:false', 'application:Confirm:true:false', 'application:Waiting For University Approval:true:false',
      'scholarship:Complete:false:false', 'scholarship:Confirm:false:true', 'scholarship:Waiting For Approval:false:false']);
    assert.equal(await scalar(`select count(*) from pg_tables where schemaname='public' and tablename in
      ('worker_details','workflow_statuses','students','student_staff_assignments','university_applications','application_history','student_notes','student_documents','yearly_reports') and rowsecurity`), 9);
    await db.exec('set role anon');
    await assert.rejects(db.query('select * from public.students'), /permission denied/);
    await db.exec('reset role');
    shared = await as(admin, () => scalar("select public.create_student('Shared','Student','1','male','2026-01-01','international','',$1::uuid[],'{}')", [[workerA, workerB]]));
    unassigned = await as(admin, () => scalar("select public.create_student('Unassigned','Student','1','male','2026-01-01','eu_equivalent',null,'{}','{}')"));
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
      assert.equal((await db.query("update public.students set first_name='Should not change' where id=$1",[unassigned])).affectedRows, 0);
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
      await db.query("update public.students set first_name='Shared', file_opened_at=file_opened_at where id=$1",[shared]);
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

  await t.test('the public staff form only queues a request; an admin account creation or link applies it', async () => {
    const newWorker = '20000000-0000-4000-8000-000000000003';
    async function asAnon(action) {
      await db.exec('set role anon');
      try { return await action(); } finally { await db.exec('reset role'); }
    }
    await asAnon(async () => {
      await db.query("select public.submit_staff_registration('Typo Name',' New.Worker@Example.test ','555','male','Old Road')");
      await db.query("select public.submit_staff_registration('New Worker','new.worker@example.test','555 0100','female','12 Example Road, Dhaka')");
      await assert.rejects(db.query("select public.submit_staff_registration('X','new@example.test','555','male','Road')"), /full name/);
      await assert.rejects(db.query("select public.submit_staff_registration('Someone','not-an-email','555','male','Road')"), /valid email/);
      await assert.rejects(db.query("select public.submit_staff_registration('Someone','s@example.test','555','admin','Road')"), /gender/);
      await assert.rejects(db.query("select public.submit_staff_registration('Someone','s@example.test','555','male','')"), /address/);
      await assert.rejects(db.query('select * from public.staff_registrations'), /permission denied/);
      await assert.rejects(db.query("insert into public.staff_registrations(full_name,email,phone,gender,address) values('Direct','direct@example.test','555','male','Road')"), /permission denied/);
      await assert.rejects(db.query("select public.resolve_staff_registration(gen_random_uuid(),'dismiss')"), /permission denied/);
    });
    assert.equal(await scalar("select full_name from public.staff_registrations where status='pending'"), 'New Worker', 'a resend corrects the waiting request');
    const request = await scalar('select id from public.staff_registrations');
    await as(workerA, async () => {
      assert.equal(await scalar('select count(*) from public.staff_registrations'), 0);
      await assert.rejects(db.query("select public.resolve_staff_registration($1,'dismiss')",[request]), /Only an admin/);
    });
    assert.equal(await as(admin, () => scalar('select count(*) from public.staff_registrations')), 1);

    await db.query('insert into auth.users(id,email) values($1,$2)', [newWorker, 'new.worker@example.test']);
    const profile = (await db.query('select full_name, role::text from public.profiles where id=$1',[newWorker])).rows[0];
    assert.deepEqual(profile, { full_name: 'New Worker', role: 'staff' });
    assert.deepEqual((await db.query('select phone, gender, address from public.worker_details where profile_id=$1',[newWorker])).rows[0],
      { phone: '555 0100', gender: 'female', address: '12 Example Road, Dhaka' });
    assert.equal(await scalar("select profile_id from public.staff_registrations where status='linked'"), newWorker);

    await asAnon(() => db.query("select public.submit_staff_registration('Worker Bee','workerb@example.test','777','male','Bee Street')"));
    await asAnon(() => db.query("select public.submit_staff_registration('Nobody Yet','nobody@example.test','555','other','Road')"));
    await asAnon(() => db.query("select public.submit_staff_registration('Not The Owner','owner@example.test','555','male','Road')"));
    const pending = async (email) => scalar("select id from public.staff_registrations where email=$1 and status='pending'",[email]);
    await as(admin, async () => {
      await db.query("select public.resolve_staff_registration($1,'link')",[await pending('workerb@example.test')]);
      await assert.rejects(db.query("select public.resolve_staff_registration($1,'link')",[await pending('nobody@example.test')]), /No staff account/);
      await assert.rejects(db.query("select public.resolve_staff_registration($1,'link')",[await pending('owner@example.test')]), /No staff account/, 'the form never renames an admin');
      await db.query("select public.resolve_staff_registration($1,'dismiss')",[await pending('nobody@example.test')]);
    });
    assert.equal(await scalar('select full_name from public.profiles where id=$1',[workerB]), 'Worker Bee');
    assert.equal(await scalar('select phone from public.worker_details where profile_id=$1',[workerB]), '777');
    await as(admin, () => db.query("select public.save_worker($1,'Worker Bee','777',null,null,'active')",[workerB]));
    assert.equal(await scalar('select address from public.worker_details where profile_id=$1',[workerB]), 'Bee Street', 'omitted gender/address are kept');
    await as(admin, () => db.query("select public.save_worker($1,'Worker Bee','777',null,null,'active','female','New Street')",[workerB]));
    assert.deepEqual((await db.query('select gender, address from public.worker_details where profile_id=$1',[workerB])).rows[0], { gender: 'female', address: 'New Street' });
    await as(workerA, () => assert.rejects(db.query("select public.save_worker($1,'Hacked','1',null,null,'active','male','x')",[workerB]), /Only an admin/));
    assert.equal(await scalar('select full_name from public.profiles where id=$1',[admin]), 'Owner');
    assert.equal(await scalar("select count(*) from public.staff_registrations where status='dismissed'"), 1);

    await db.query("insert into public.staff_registrations(full_name,email,phone,gender,address) select 'Filler', 'filler' || n || '@example.test', '555', 'other', 'Road' from generate_series(1,49) n");
    await asAnon(() => assert.rejects(db.query("select public.submit_staff_registration('One Too Many','overflow@example.test','555','male','Road')"), /cannot be taken/));
  });

  await t.test('a student file takes name and surname, applicant type, an admin-only Drive link, and notifies each admin once', async () => {
    // Accounts here are created after the migration, so no admin has a marker yet; the app falls back to the account's creation time.
    assert.equal(await scalar('select count(*) from public.admin_alert_reads'), 0);
    const student = await as(admin, () => scalar("select public.create_student('  Ahmed ','Rahman Khan','555','male','2026-10-04','international','https://drive.google.com/drive/folders/abc',$1::uuid[],jsonb_build_object('email','ahmed@gmail.com'))",[[workerA]]));
    assert.deepEqual((await db.query('select first_name, surname, full_name, applicant_type, drive_link from public.students where id=$1',[student])).rows[0],
      { first_name: 'Ahmed', surname: 'Rahman Khan', full_name: 'Ahmed Rahman Khan', applicant_type: 'international', drive_link: 'https://drive.google.com/drive/folders/abc' });
    await as(admin, async () => {
      await assert.rejects(db.query("select public.create_student('A','','1','male','2026-10-04','international','',$1::uuid[],'{}')",[[]]), /Enter the surname/);
      await assert.rejects(db.query("select public.create_student('A','B','1','male','2026-10-04','somewhere','',$1::uuid[],'{}')",[[]]), /EU equivalent or international/);
      await assert.rejects(db.query("select public.create_student('A','B','1','male','2026-10-04','international','javascript:alert(1)',$1::uuid[],'{}')",[[]]), /check constraint/);
    });
    await as(workerA, async () => {
      assert.equal(await scalar('select drive_link from public.students where id=$1',[student]), 'https://drive.google.com/drive/folders/abc', 'assigned staff can open the Drive link');
      await assert.rejects(db.query("update public.students set drive_link='https://example.test/x' where id=$1",[student]), /Only an admin can change the Drive link/);
      await assert.rejects(db.query("update public.students set full_name='Direct' where id=$1",[student]), /permission denied/);
      await db.query("update public.students set surname='Khan', applicant_type='eu_equivalent', drive_link=drive_link where id=$1",[student]);
      assert.equal(await scalar('select count(*) from public.admin_alert_reads'), 0);
      await assert.rejects(db.query('select public.mark_student_files_seen(now())'), /Only an admin/);
    });
    assert.equal(await scalar('select full_name from public.students where id=$1',[student]), 'Ahmed Khan');
    assert.equal(await scalar("select full_name from public.students where id=$1",[shared]), 'Shared Student', 'existing names were split and rebuilt');
    await as(admin, async () => {
      await db.query("select public.mark_student_files_seen(now() + interval '1 day')");
      assert.equal(await scalar('select count(*) from public.admin_alert_reads'), 1);
      const seen = await scalar('select student_files_seen_at from public.admin_alert_reads');
      assert.ok(seen <= new Date(), 'never marked into the future');
      await db.query("select public.mark_student_files_seen('2000-01-01')");
      assert.equal((await scalar('select student_files_seen_at from public.admin_alert_reads')).getTime(), seen.getTime(), 'never moves backwards');
    });
    await as(developer, () => db.query("select public.mark_student_files_seen(now())"));
    assert.equal(await scalar('select count(*) from public.admin_alert_reads'), 2, 'marking is per admin');
    assert.equal(await as(developer, () => scalar('select count(*) from public.admin_alert_reads')), 1, 'an admin reads only their own marker');
    await db.exec('set role anon');
    try {
      await assert.rejects(db.query("select public.submit_student_form('x','','','[]'::jsonb)"), /does not exist/, 'the removed student form is no longer callable');
      await assert.rejects(db.query('select * from public.admin_alert_reads'), /permission denied/);
    } finally { await db.exec('reset role'); }
  });

  await t.test('application details, and closing a file with a reason; only an admin reopens', async () => {
    const student = await as(admin, () => scalar("select public.create_student('Close','Me','1','male','2026-10-04','international','',$1::uuid[],jsonb_build_object('email','close@gmail.com'))",[[workerA]]));
    const complete = await scalar("select id from public.workflow_statuses where category='application' and label='Complete'");
    const app = await as(workerA, () => scalar(`insert into public.university_applications(student_id,university_name,preferred_subject,entrance_exam,entrance_exam_date,
      scholarship_name,scholarship_link,enrollment_fee_paid,application_status_id) values($1,'Milan','Medicine','IMAT','2026-11-20','DSU','https://example.test/dsu',true,$2) returning id`,[student, complete]));
    assert.deepEqual((await db.query('select preferred_subject, entrance_exam, entrance_exam_date::text, scholarship_name, enrollment_fee_paid, admission_confirmed, is_submitted from public.university_applications where id=$1',[app])).rows[0],
      { preferred_subject: 'Medicine', entrance_exam: 'IMAT', entrance_exam_date: '2026-11-20', scholarship_name: 'DSU', enrollment_fee_paid: true, admission_confirmed: false, is_submitted: true });
    await as(workerA, async () => {
      await assert.rejects(db.query("update public.university_applications set scholarship_link='javascript:x' where id=$1",[app]), /check constraint/);
      await assert.rejects(db.query("select public.close_student_file($1,'no')",[student]), /reason/);
      await assert.rejects(db.query("select public.close_student_file($1,'Not mine')",[unassigned]), /unavailable/);
      await assert.rejects(db.query("update public.students set closed_at=now() where id=$1",[student]), /permission denied/);
      await db.query("select public.close_student_file($1,'Student chose another agency')",[student]);
      assert.equal(await scalar('select close_reason from public.students where id=$1',[student]), 'Student chose another agency', 'staff still see the closed file and its reason');
      assert.match(await scalar('select body from public.student_notes where student_id=$1',[student]), /File closed\. Reason: Student chose another agency/);
      assert.equal((await db.query("update public.students set phone='1' where id=$1",[student])).affectedRows, 0, 'a closed file is read-only');
      assert.equal((await db.query("update public.university_applications set entrance_exam='TOLC' where id=$1",[app])).affectedRows, 0);
      await assert.rejects(db.query("insert into public.student_notes(student_id,body) values($1,'x')",[student]), /row-level security/);
      await assert.rejects(db.query("select public.close_student_file($1,'Again please')",[student]), /already closed/);
      await assert.rejects(db.query('select public.reopen_student_file($1)',[student]), /Only an admin/);
    });
    await as(admin, async () => {
      assert.equal((await db.query("update public.students set phone='1' where id=$1",[student])).affectedRows, 0, 'read-only for admins too');
      await db.query('select public.reopen_student_file($1)',[student]);
      await assert.rejects(db.query('select public.reopen_student_file($1)',[student]), /not closed/);
    });
    assert.deepEqual((await db.query('select closed_at, close_reason from public.students where id=$1',[student])).rows[0], { closed_at: null, close_reason: null });
    assert.equal((await as(workerA, () => db.query("update public.students set phone='2' where id=$1",[student]))).affectedRows, 1, 'reopened files are editable again');
  });

  await t.test('notes carry a priority; Urgent/Moderate are resolved by whoever may write the file', async () => {
    const student = await as(admin, () => scalar("select public.create_student('Note','Priority','1','male','2026-10-05','international','',$1::uuid[],jsonb_build_object('email','np@gmail.com'))",[[workerA]]));
    const add = (priority) => scalar("insert into public.student_notes(student_id,body,priority) values($1,'Passport expires soon',$2) returning id",[student, priority]);
    const [urgent, normal] = await as(workerA, async () => [await add('urgent'), await add('normal')]);
    assert.equal(await scalar("select priority from public.student_notes where id=$1",[normal]), 'normal');
    await as(workerA, async () => {
      await assert.rejects(add('critical'), /check constraint/);
      await assert.rejects(db.query('update public.student_notes set resolved_at=now() where id=$1',[urgent]), /permission denied/);
      await assert.rejects(db.query('select public.resolve_student_note($1)',[normal]), /Only an Urgent or Moderate/);
    });
    await as(workerB, () => assert.rejects(db.query('select public.resolve_student_note($1)',[urgent]), /unavailable/));
    await as(workerA, () => db.query('select public.resolve_student_note($1)',[urgent]));
    assert.equal(await scalar('select resolved_by from public.student_notes where id=$1',[urgent]), workerA);
    await as(admin, () => assert.rejects(db.query('select public.resolve_student_note($1)',[urgent]), /already resolved/));
    const second = await as(workerA, () => add('moderate'));
    await as(workerA, () => db.query("select public.close_student_file($1,'Finished with this student')",[student]));
    await as(admin, () => assert.rejects(db.query('select public.resolve_student_note($1)',[second]), /closed or archived/));
  });

  await t.test('staff open a file assigned to themselves, dated today, with no Drive link; the new details are validated', async () => {
    const open = (args) => db.query('select public.create_student($1,$2,$3,$4,$5,$6,$7,$8::uuid[],$9) as id', args);
    const details = { email: 'nadia@gmail.com', agency_email: 'nadia.agency@gmail.com', file_opening_charge_percent: '40', passport_number: 'AB1234567',
      referral: 'Friend', intake_session: '2027/28', program: 'master', pre_enrollment_status: 'submitted', visa_appointment_date: '2027-03-01',
      visa_file_submitted: 'true', visa_status: 'approved', visa_country: 'Bangladesh', date_of_birth: '2001-05-06', birth_place: 'Dhaka',
      tax_code: 'NDAHSS01E46Z249X', father_name: 'Father', mother_name: 'Mother', permanent_address: 'Dhaka', present_address: 'Milan',
      sponsorship: 'sponsor', sponsor_name: 'Uncle Rahim', sponsor_relationship: 'Uncle' };
    const student = await as(workerB, async () =>
      (await open(['Nadia', 'Hossain', '+880 1', 'female', '2020-01-01', null, 'https://drive.google.com/x', [workerA], details])).rows[0].id);
    assert.deepEqual((await db.query(`select file_opened_at = current_date as today, drive_link, created_by, gender, applicant_type, email,
      file_opening_charge_percent::text, program, visa_file_submitted, visa_status, sponsor_relationship from public.students where id=$1`,[student])).rows[0],
      { today: true, drive_link: null, created_by: workerB, gender: 'female', applicant_type: null, email: 'nadia@gmail.com',
        file_opening_charge_percent: '40.00', program: 'master', visa_file_submitted: true, visa_status: 'approved', sponsor_relationship: 'Uncle' });
    assert.deepEqual((await db.query('select worker_id from public.student_staff_assignments where student_id=$1 and ended_at is null',[student])).rows.map(r => r.worker_id),
      [workerB], 'assigned only to the staff member who opened it');
    assert.equal(await as(workerB, () => scalar('select count(*) from public.students where id=$1',[student])), 1);
    assert.equal(await as(workerA, () => scalar('select count(*) from public.students where id=$1',[student])), 0);
    await as(workerB, async () => {
      await assert.rejects(open(['A', 'B', '', 'male', null, null, '', [], {}]), /phone number/);
      await assert.rejects(open(['A', 'B', '1', null, null, null, '', [], {}]), /sex/);
      await assert.rejects(open(['A', 'B', '1', 'male', null, null, '', [], { file_opening_charge_percent: '140' }]), /check constraint/);
      await assert.rejects(open(['A', 'B', '1', 'male', null, null, '', [], { program: 'phd' }]), /check constraint/);
      await assert.rejects(open(['A', 'B', '1', 'male', null, null, '', [], { visa_status: 'approved' }]), /check constraint/, 'visa outcome needs an appointment date');
      await assert.rejects(open(['A', 'B', '1', 'male', null, null, '', [], { sponsorship: 'sponsor', sponsor_name: 'X' }]), /check constraint/, 'a sponsor needs a relationship');
      await assert.rejects(open(['A', 'B', '1', 'male', null, null, '', [], { sponsorship: 'self', sponsor_name: 'X' }]), /check constraint/);
      await db.query("update public.students set visa_status='rejected', visa_file_submitted=false where id=$1",[student]);
      await assert.rejects(db.query("update public.students set file_opened_at='2020-01-01' where id=$1",[student]), /admin/);
    });
    await db.query("update public.profiles set status='inactive' where id=$1",[workerB]);
    try { await as(workerB, () => assert.rejects(open(['A', 'B', '1', 'male', null, null, '', [], {}]), /Only an admin or an active staff/)); }
    finally { await db.query("update public.profiles set status='active' where id=$1",[workerB]); }
    await db.exec('set role anon');
    try { await assert.rejects(open(['A', 'B', '1', 'male', null, null, '', [], {}]), /permission denied/); }
    finally { await db.exec('reset role'); }
  });
});
