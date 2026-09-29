-- ============================================================
-- Demo seed data (self-contained — no need to register anyone first)
--
-- HOW TO RUN: paste this whole file into Supabase Dashboard -> SQL Editor
-- and press Run (after running migrations 0001..0003).
--
-- It creates a DEMO TEACHER directly in Supabase Auth:
--     email:    demo.teacher@quizplatform.test
--     password: Demo@12345
-- (Inserting straight into auth.users bypasses Supabase's sign-up email
-- validation, which rejects fake domains such as example.com.)
-- If you would rather attach the demo data to a teacher account you already
-- registered, change v_teacher_email below to that account's email.
--
-- Demo students created below all share PIN: 1234
-- Usernames: hs001 ... hs010.   Assignment join code: DEMO01
-- Safe to re-run? NO — run it once (it would hit unique-code conflicts).
-- ============================================================

do $$
declare
  v_teacher_id uuid;
  v_class1_id uuid;
  v_class2_id uuid;
  v_student_ids uuid[] := '{}';
  v_sid uuid;
  v_quiz_all_types uuid;
  v_quiz_math uuid;
  v_quiz_geo uuid;
  v_q_id uuid;
  v_assignment_id uuid;
  v_attempt_id uuid;
  v_pin_hash text;
  v_teacher_email text := 'demo.teacher@quizplatform.test';
  v_teacher_password text := 'Demo@12345';
  i int;
  names text[] := array['Nguyễn Văn An','Trần Thị Bình','Lê Văn Cường','Phạm Thị Dung','Hoàng Văn Em',
                         'Vũ Thị Phương','Đặng Văn Giang','Bùi Thị Hoa','Ngô Văn Inh','Đỗ Thị Kim'];
begin
  select id into v_teacher_id from auth.users where email = v_teacher_email;

  if v_teacher_id is null then
    v_teacher_id := gen_random_uuid();
    -- NOTE: the *_token columns must be '' (not NULL) or GoTrue fails to
    -- read the row at login time.
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_teacher_id, 'authenticated', 'authenticated',
      v_teacher_email, crypt(v_teacher_password, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{"full_name":"Giáo viên Demo"}', now(), now(),
      '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), v_teacher_id, v_teacher_id::text,
      jsonb_build_object('sub', v_teacher_id::text, 'email', v_teacher_email, 'email_verified', true),
      'email', now(), now(), now()
    );
  end if;

  -- the handle_new_user trigger has created the profile row by now
  if not exists (select 1 from profiles where id = v_teacher_id) then
    raise exception 'Profile row missing for teacher % — did migration 0001 run completely?', v_teacher_email;
  end if;

  -- Real bcryptjs hash (10 rounds) for PIN "1234", generated with:
  --   node -e "require('bcryptjs').hash('1234',10).then(console.log)"
  -- Verified to compare() true against "1234" — fine for local/demo data only.
  v_pin_hash := '$2b$10$HPKaZBFGQdH/lt3wOf.tPOOJopVQgO6I5ZAyIZPie2heXNwjE1tMy';

  -- ---------------- Classes ----------------
  insert into classes (teacher_id, name, class_code, description)
    values (v_teacher_id, 'Lớp 10A1', 'AB12CD', 'Lớp chủ nhiệm - năm học hiện tại')
    returning id into v_class1_id;
  insert into classes (teacher_id, name, class_code, description)
    values (v_teacher_id, 'Lớp 10A2', 'EF34GH', 'Lớp thỉnh giảng')
    returning id into v_class2_id;

  -- ---------------- Students ----------------
  for i in 1..10 loop
    insert into students (teacher_id, username, student_code, pin_hash, full_name)
    values (v_teacher_id, 'hs' || lpad(i::text, 3, '0'), 'HS' || lpad(i::text, 3, '0'), v_pin_hash, names[i])
    returning id into v_sid;
    v_student_ids := array_append(v_student_ids, v_sid);
    insert into class_members (class_id, student_id)
      values (case when i <= 7 then v_class1_id else v_class2_id end, v_sid);
  end loop;

  -- ---------------- Quiz 1: one question of every implemented type ----------------
  insert into quizzes (teacher_id, title, slug, description, status)
    values (v_teacher_id, 'Kiến thức tổng hợp (đủ 9 loại câu hỏi)', 'kien-thuc-tong-hop-demo', 'Bộ câu hỏi demo dùng để kiểm thử toàn bộ Question Engine.', 'published')
    returning id into v_quiz_all_types;

  insert into quiz_questions (quiz_id, type, order_index, content, points, time_limit, data) values
  (v_quiz_all_types, 'multiple_choice', 0, 'Thủ đô của Việt Nam là?', 100, 30,
    '{"type":"multiple_choice","options":[{"id":"o1","text":"TP. Hồ Chí Minh"},{"id":"o2","text":"Hà Nội"},{"id":"o3","text":"Đà Nẵng"},{"id":"o4","text":"Cần Thơ"}],"correctOptionId":"o2","shuffleOptions":true}'),
  (v_quiz_all_types, 'multi_select', 1, 'Đâu là các tỉnh/thành thuộc Đồng bằng sông Cửu Long?', 100, 30,
    '{"type":"multi_select","options":[{"id":"o1","text":"Cần Thơ"},{"id":"o2","text":"An Giang"},{"id":"o3","text":"Đồng Tháp"},{"id":"o4","text":"Hà Nội"}],"correctOptionIds":["o1","o2","o3"],"scoringMode":"partial","shuffleOptions":true}'),
  (v_quiz_all_types, 'true_false', 2, 'Việt Nam nằm ở khu vực Đông Nam Á.', 50, 15,
    '{"type":"true_false","correctValue":true}'),
  (v_quiz_all_types, 'fill_blank', 3, 'Thủ đô của Việt Nam là ______.', 100, 30,
    '{"type":"fill_blank","acceptedAnswers":["Hà Nội","Ha Noi"],"caseSensitive":false}'),
  (v_quiz_all_types, 'open_ended', 4, 'Hãy giải thích ngắn gọn vì sao nước biển có vị mặn.', 100, 120,
    '{"type":"open_ended","instructions":"Viết 2-3 câu.","characterLimit":500}'),
  (v_quiz_all_types, 'reorder', 5, 'Sắp xếp các bước pha cà phê phin theo đúng thứ tự.', 100, 45,
    '{"type":"reorder","items":[{"id":"r1","text":"Xay cà phê"},{"id":"r2","text":"Cho cà phê vào phin"},{"id":"r3","text":"Chế nước sôi"},{"id":"r4","text":"Chờ chiết xuất"}]}'),
  (v_quiz_all_types, 'match', 6, 'Ghép quốc gia với thủ đô tương ứng.', 100, 45,
    '{"type":"match","pairs":[{"id":"m1","left":"Việt Nam","right":"Hà Nội"},{"id":"m2","left":"Nhật Bản","right":"Tokyo"},{"id":"m3","left":"Thái Lan","right":"Bangkok"}]}'),
  (v_quiz_all_types, 'categorize', 7, 'Phân loại các mục sau vào đúng nhóm.', 100, 45,
    '{"type":"categorize","categories":[{"id":"c1","name":"Trái cây"},{"id":"c2","name":"Đồ uống"}],"items":[{"id":"i1","text":"Táo","categoryId":"c1"},{"id":"i2","text":"Cam","categoryId":"c1"},{"id":"i3","text":"Cà phê","categoryId":"c2"},{"id":"i4","text":"Trà","categoryId":"c2"}]}'),
  (v_quiz_all_types, 'drag_drop', 8, 'Kéo mỗi mục vào đúng nhóm.', 100, 45,
    '{"type":"drag_drop","zones":[{"id":"z1","label":"Coffee"},{"id":"z2","label":"Dairy"}],"items":[{"id":"d1","label":"Espresso","zoneId":"z1"},{"id":"d2","label":"Milk","zoneId":"z2"},{"id":"d3","label":"Latte","zoneId":"z1"}]}');

  -- ---------------- Quiz 2 & 3: smaller topical quizzes ----------------
  insert into quizzes (teacher_id, title, slug, description, status)
    values (v_teacher_id, 'Toán học cơ bản', 'toan-hoc-co-ban', 'Ôn tập nhanh', 'published')
    returning id into v_quiz_math;
  insert into quiz_questions (quiz_id, type, order_index, content, points, time_limit, data) values
  (v_quiz_math, 'multiple_choice', 0, '5 + 7 = ?', 100, 20,
    '{"type":"multiple_choice","options":[{"id":"o1","text":"10"},{"id":"o2","text":"12"},{"id":"o3","text":"13"}],"correctOptionId":"o2","shuffleOptions":true}'),
  (v_quiz_math, 'true_false', 1, '10 chia hết cho 3.', 50, 15, '{"type":"true_false","correctValue":false}');

  insert into quizzes (teacher_id, title, slug, description, status)
    values (v_teacher_id, 'Địa lý Việt Nam', 'dia-ly-viet-nam', 'Ôn tập nhanh', 'draft')
    returning id into v_quiz_geo;
  insert into quiz_questions (quiz_id, type, order_index, content, points, time_limit, data) values
  (v_quiz_geo, 'fill_blank', 0, 'Dãy núi cao nhất Việt Nam có đỉnh ______.', 100, 30,
    '{"type":"fill_blank","acceptedAnswers":["Fansipan","Phan Xi Păng"],"caseSensitive":false}');

  -- ---------------- Assignment: quiz 1 assigned to Lớp 10A1 ----------------
  insert into assignments (quiz_id, teacher_id, title, class_id, join_code, status, settings)
    values (
      v_quiz_all_types, v_teacher_id, 'Kiểm tra 15 phút - Tổng hợp', v_class1_id, 'DEMO01', 'open',
      '{"time_limit_seconds":900,"attempts_allowed":1,"randomize_questions":false,"randomize_answers":true,
        "allow_back_navigation":true,"show_result":true,"show_correct_answer":true,"show_leaderboard":true}'::jsonb
    )
    returning id into v_assignment_id;

  insert into assignment_students (assignment_id, student_id)
    select v_assignment_id, student_id from class_members where class_id = v_class1_id;

  -- ---------------- Sample attempts: first 3 students of Lớp 10A1 already submitted ----------------
  for i in 1..3 loop
    v_sid := v_student_ids[i];
    insert into attempts (
      assignment_id, student_id, status, attempt_number, question_order,
      started_at, submitted_at, score, max_score, correct_count, wrong_count,
      unanswered_count, completion_percent, time_spent, current_question_index, last_seen_at
    )
    select
      v_assignment_id, v_sid, 'graded', 1,
      array(select id from quiz_questions where quiz_id = v_quiz_all_types order by order_index),
      now() - interval '1 day', now() - interval '1 day' + interval '12 minutes',
      (600 + i * 50), 850, (6 + i), (3 - i), 0, 100, 720 + i * 10, 8, now() - interval '1 day'
    returning id into v_attempt_id;

    insert into answers (attempt_id, question_id, answer, is_answered, is_correct, points_earned, grading_status)
    select v_attempt_id, id, '{}'::jsonb, true, (random() > 0.3), 0, 'auto'
    from quiz_questions where quiz_id = v_quiz_all_types;
  end loop;

end $$;
