-- Demo seed for local development ONLY. Never apply with --remote.
-- Re-runnable: wipes demo rows first (all ids/emails below are demo-scoped).
-- All demo logins use password: password123
--   owner@demo.tn (owner) / sec@demo.tn (secretary)
--   karim@demo.tn, leila@demo.tn (instructors)
--   sara@demo.tn, Ahmed@demo.tn, yasmine@demo.tn, omar@demo.tn (students)

-- ---------- wipe previous demo rows (children first) ----------
DELETE FROM payment WHERE school_id = 'sch-demo';
DELETE FROM lesson WHERE school_id = 'sch-demo';
DELETE FROM exam WHERE school_id = 'sch-demo';
DELETE FROM enrollment WHERE school_id = 'sch-demo';
DELETE FROM notification_outbox WHERE school_id = 'sch-demo';
DELETE FROM audit_event WHERE school_id = 'sch-demo';
DELETE FROM student_profile WHERE school_id = 'sch-demo';
DELETE FROM instructor_profile WHERE school_id = 'sch-demo';
DELETE FROM vehicle WHERE school_id = 'sch-demo';
DELETE FROM package WHERE school_id = 'sch-demo';
DELETE FROM school_member WHERE school_id = 'sch-demo';
DELETE FROM school WHERE id = 'sch-demo';
DELETE FROM account WHERE user_id IN (SELECT id FROM user WHERE email LIKE '%@demo.tn');
DELETE FROM session WHERE user_id IN (SELECT id FROM user WHERE email LIKE '%@demo.tn');
DELETE FROM user WHERE email LIKE '%@demo.tn';

-- ---------- users (password123 scrypt hash for all) ----------
-- hash generated via: tsx -e "import {hashPassword} from 'better-auth/crypto'"
INSERT INTO user (id, name, email, email_verified, role, banned, created_at, updated_at) VALUES
  ('usr-demo-owner', 'Gérant Ennour', 'owner@demo.tn', 0, 'user', 0, strftime('%s','now'), strftime('%s','now')),
  ('usr-demo-sec', 'Salma Secrétaire', 'sec@demo.tn', 0, 'user', 0, strftime('%s','now'), strftime('%s','now')),
  ('usr-demo-karim', 'Karim Moniteur', 'karim@demo.tn', 0, 'user', 0, strftime('%s','now'), strftime('%s','now')),
  ('usr-demo-leila', 'Leila Monitrice', 'leila@demo.tn', 0, 'user', 0, strftime('%s','now'), strftime('%s','now')),
  ('usr-demo-sara', 'Sara Ben Ahmed', 'sara@demo.tn', 0, 'user', 0, strftime('%s','now'), strftime('%s','now')),
  ('usr-demo-Ahmed', 'Ahmed Trabelsi', 'Ahmed@demo.tn', 0, 'user', 0, strftime('%s','now'), strftime('%s','now')),
  ('usr-demo-yasmine', 'Yasmine Mansour', 'yasmine@demo.tn', 0, 'user', 0, strftime('%s','now'), strftime('%s','now')),
  ('usr-demo-omar', 'Omar Haddad', 'omar@demo.tn', 0, 'user', 0, strftime('%s','now'), strftime('%s','now'));

INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
SELECT 'acc-' || id, id, 'credential', id,
  'cfd9e7b68d191e43f0155cdbbeab5b72:e3f57061f2f42344a878245c732524e1aeb8c599198b5189eae8b74bca52659326576828b3cab7cfd2c7c20ae73eb4eb31dbc88a41e23b736e312f186cc00378',
  strftime('%s','now'), strftime('%s','now')
FROM user WHERE email LIKE '%@demo.tn';

-- ---------- school + memberships ----------
INSERT INTO school (id, name, slug, phone, address, city, status, created_at, updated_at) VALUES
  ('sch-demo', 'Auto-École Ennour', 'ennour-demo', '+216 20 123 456', '12 Rue de la République', 'Tunis', 'active', strftime('%s','now'), strftime('%s','now'));

INSERT INTO school_member (id, school_id, user_id, role, status, joined_at, created_at, updated_at) VALUES
  ('mem-demo-owner', 'sch-demo', 'usr-demo-owner', 'owner', 'active', strftime('%s','now'), strftime('%s','now'), strftime('%s','now')),
  ('mem-demo-sec', 'sch-demo', 'usr-demo-sec', 'secretary', 'active', strftime('%s','now'), strftime('%s','now'), strftime('%s','now')),
  ('mem-demo-karim', 'sch-demo', 'usr-demo-karim', 'instructor', 'active', strftime('%s','now'), strftime('%s','now'), strftime('%s','now')),
  ('mem-demo-leila', 'sch-demo', 'usr-demo-leila', 'instructor', 'active', strftime('%s','now'), strftime('%s','now'), strftime('%s','now')),
  ('mem-demo-sara', 'sch-demo', 'usr-demo-sara', 'student', 'active', strftime('%s','now'), strftime('%s','now'), strftime('%s','now')),
  ('mem-demo-Ahmed', 'sch-demo', 'usr-demo-Ahmed', 'student', 'active', strftime('%s','now'), strftime('%s','now'), strftime('%s','now')),
  ('mem-demo-yasmine', 'sch-demo', 'usr-demo-yasmine', 'student', 'active', strftime('%s','now'), strftime('%s','now'), strftime('%s','now')),
  ('mem-demo-omar', 'sch-demo', 'usr-demo-omar', 'student', 'active', strftime('%s','now'), strftime('%s','now'), strftime('%s','now'));

-- ---------- profiles ----------
INSERT INTO instructor_profile (id, school_id, user_id, first_name, last_name, phone, active, created_at, updated_at) VALUES
  ('inst-demo-karim', 'sch-demo', 'usr-demo-karim', 'Karim', 'Moniteur', '+216 21 111 111', 1, strftime('%s','now'), strftime('%s','now')),
  ('inst-demo-leila', 'sch-demo', 'usr-demo-leila', 'Leila', 'Monitrice', '+216 21 222 222', 1, strftime('%s','now'), strftime('%s','now'));

INSERT INTO student_profile (id, school_id, user_id, first_name, last_name, phone, license_category, status, assigned_instructor_id, created_at, updated_at) VALUES
  ('stud-demo-sara', 'sch-demo', 'usr-demo-sara', 'Sara', 'Ben Ahmed', '+216 22 333 333', 'B', 'in_training', 'inst-demo-karim', strftime('%s','now'), strftime('%s','now')),
  ('stud-demo-Ahmed', 'sch-demo', 'usr-demo-Ahmed', 'Ahmed', 'Trabelsi', '+216 22 444 444', 'B', 'in_training', 'inst-demo-karim', strftime('%s','now'), strftime('%s','now')),
  ('stud-demo-yasmine', 'sch-demo', 'usr-demo-yasmine', 'Yasmine', 'Mansour', '+216 22 555 555', 'B', 'ready_for_exam', 'inst-demo-leila', strftime('%s','now'), strftime('%s','now')),
  ('stud-demo-omar', 'sch-demo', 'usr-demo-omar', 'Omar', 'Haddad', '+216 22 666 666', 'B', 'new', NULL, strftime('%s','now'), strftime('%s','now'));

-- ---------- vehicles + package ----------
INSERT INTO vehicle (id, school_id, name, plate, category, transmission, active, created_at, updated_at) VALUES
  ('veh-demo-1', 'sch-demo', 'Peugeot 208', '123 TUN 4567', 'B', 'manual', 1, strftime('%s','now'), strftime('%s','now')),
  ('veh-demo-2', 'sch-demo', 'Renault Clio 5', '234 TUN 8910', 'B', 'manual', 1, strftime('%s','now'), strftime('%s','now'));

INSERT INTO package (id, school_id, name, driving_minutes, parking_sessions, theory_minutes, exam_drive_attempts, exam_parking_attempts, price_millimes, active, created_at, updated_at) VALUES
  ('pkg-demo-b', 'sch-demo', 'Permis B', 1200, 10, 1200, 1, 1, 1500000, 1, strftime('%s','now'), strftime('%s','now'));

-- ---------- enrollments (snapshot from package) ----------
INSERT INTO enrollment (id, school_id, student_id, package_id, driving_minutes, parking_sessions, theory_minutes, exam_drive_attempts, exam_parking_attempts, price_millimes, status, started_at, created_at, updated_at) VALUES
  ('enr-demo-sara', 'sch-demo', 'stud-demo-sara', 'pkg-demo-b', 1200, 10, 1200, 1, 1, 1500000, 'active', strftime('%s','now','-20 days'), strftime('%s','now'), strftime('%s','now')),
  ('enr-demo-Ahmed', 'sch-demo', 'stud-demo-Ahmed', 'pkg-demo-b', 1200, 10, 1200, 1, 1, 1500000, 'active', strftime('%s','now','-30 days'), strftime('%s','now'), strftime('%s','now')),
  ('enr-demo-yasmine', 'sch-demo', 'stud-demo-yasmine', 'pkg-demo-b', 1200, 10, 1200, 1, 1, 1500000, 'active', strftime('%s','now','-60 days'), strftime('%s','now'), strftime('%s','now')),
  ('enr-demo-omar', 'sch-demo', 'stud-demo-omar', 'pkg-demo-b', 1200, 10, 1200, 1, 1, 1500000, 'active', strftime('%s','now','-2 days'), strftime('%s','now'), strftime('%s','now'));

-- ---------- payments ----------
INSERT INTO payment (id, school_id, enrollment_id, amount_millimes, method, received_by_member_id, note, created_at, updated_at) VALUES
  ('pay-demo-1', 'sch-demo', 'enr-demo-sara', 900000, 'cash', 'mem-demo-sec', 'Avance', strftime('%s','now','-19 days'), strftime('%s','now')),
  ('pay-demo-2', 'sch-demo', 'enr-demo-Ahmed', 1500000, 'bank_transfer', 'mem-demo-owner', 'Payé en totalité', strftime('%s','now','-29 days'), strftime('%s','now')),
  ('pay-demo-3', 'sch-demo', 'enr-demo-yasmine', 500000, 'cash', 'mem-demo-sec', 'Avance', strftime('%s','now','-59 days'), strftime('%s','now'));

-- ---------- lessons (times relative to today; non-overlapping) ----------
-- past completed: sara driving 1h x2, theory 2h, parking 1h; Ahmed driving 1h
INSERT INTO lesson (id, school_id, student_id, instructor_id, vehicle_id, kind, status, starts_at, ends_at, notes, created_by_member_id, created_at, updated_at) VALUES
  ('les-demo-1', 'sch-demo', 'stud-demo-sara', 'inst-demo-karim', 'veh-demo-1', 'driving', 'completed',
    strftime('%s','now','start of day','-3 days','+9 hours'), strftime('%s','now','start of day','-3 days','+10 hours'),
    'Première leçon', 'mem-demo-sec', strftime('%s','now'), strftime('%s','now')),
  ('les-demo-2', 'sch-demo', 'stud-demo-sara', 'inst-demo-karim', 'veh-demo-1', 'driving', 'completed',
    strftime('%s','now','start of day','-2 days','+9 hours'), strftime('%s','now','start of day','-2 days','+10 hours'),
    NULL, 'mem-demo-sec', strftime('%s','now'), strftime('%s','now')),
  ('les-demo-3', 'sch-demo', 'stud-demo-sara', 'inst-demo-karim', NULL, 'theory', 'completed',
    strftime('%s','now','start of day','-2 days','+14 hours'), strftime('%s','now','start of day','-2 days','+16 hours'),
    'Code de la route', 'mem-demo-sec', strftime('%s','now'), strftime('%s','now')),
  ('les-demo-4', 'sch-demo', 'stud-demo-sara', 'inst-demo-karim', 'veh-demo-2', 'parking', 'completed',
    strftime('%s','now','start of day','-1 days','+9 hours'), strftime('%s','now','start of day','-1 days','+10 hours'),
    NULL, 'mem-demo-sec', strftime('%s','now'), strftime('%s','now')),
  ('les-demo-5', 'sch-demo', 'stud-demo-Ahmed', 'inst-demo-karim', 'veh-demo-1', 'driving', 'completed',
    strftime('%s','now','start of day','-1 days','+11 hours'), strftime('%s','now','start of day','-1 days','+12 hours'),
    NULL, 'mem-demo-sec', strftime('%s','now'), strftime('%s','now')),
  ('les-demo-6', 'sch-demo', 'stud-demo-yasmine', 'inst-demo-leila', 'veh-demo-2', 'driving', 'completed',
    strftime('%s','now','start of day','-5 days','+9 hours'), strftime('%s','now','start of day','-5 days','+11 hours'),
    'Double leçon', 'mem-demo-sec', strftime('%s','now'), strftime('%s','now'));
-- today scheduled
INSERT INTO lesson (id, school_id, student_id, instructor_id, vehicle_id, kind, status, starts_at, ends_at, notes, created_by_member_id, created_at, updated_at) VALUES
  ('les-demo-7', 'sch-demo', 'stud-demo-sara', 'inst-demo-karim', 'veh-demo-1', 'driving', 'scheduled',
    strftime('%s','now','start of day','+9 hours'), strftime('%s','now','start of day','+10 hours'),
    NULL, 'mem-demo-sec', strftime('%s','now'), strftime('%s','now')),
  ('les-demo-8', 'sch-demo', 'stud-demo-Ahmed', 'inst-demo-leila', 'veh-demo-2', 'theory', 'scheduled',
    strftime('%s','now','start of day','+14 hours'), strftime('%s','now','start of day','+16 hours'),
    'Séance code', 'mem-demo-sec', strftime('%s','now'), strftime('%s','now')),
  ('les-demo-9', 'sch-demo', 'stud-demo-yasmine', 'inst-demo-leila', 'veh-demo-1', 'exam_drive', 'scheduled',
    strftime('%s','now','start of day','+1 days','+9 hours'), strftime('%s','now','start of day','+1 days','+10 hours'),
    'Examen blanc', 'mem-demo-owner', strftime('%s','now'), strftime('%s','now')),
  ('les-demo-10', 'sch-demo', 'stud-demo-omar', 'inst-demo-karim', 'veh-demo-2', 'driving', 'cancelled',
    strftime('%s','now','start of day','+1 days','+11 hours'), strftime('%s','now','start of day','+1 days','+12 hours'),
    'Annulé par élève', 'mem-demo-sec', strftime('%s','now'), strftime('%s','now'));

-- ---------- exams ----------
INSERT INTO exam (id, school_id, student_id, type, scheduled_for, status, result_note, created_at, updated_at) VALUES
  ('exam-demo-1', 'sch-demo', 'stud-demo-yasmine', 'theory', strftime('%s','now','+7 days'), 'scheduled', NULL, strftime('%s','now'), strftime('%s','now')),
  ('exam-demo-2', 'sch-demo', 'stud-demo-Ahmed', 'theory', strftime('%s','now','-10 days'), 'passed', 'Reçu 32/40', strftime('%s','now'), strftime('%s','now'));
