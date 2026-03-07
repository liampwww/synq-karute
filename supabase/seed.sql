-- ============================================================================
-- SYNQ Karute v3 — Seed Data
-- Demo salon: La Estro 代官山
-- ============================================================================

-- Fixed UUIDs for reproducible seeding
-- Organization
\set org_id   '''a1b2c3d4-0001-4000-8000-000000000001'''

-- Staff (auth user IDs are fictional — replace with real auth.users rows in dev)
\set staff1_id '''a1b2c3d4-0002-4000-8000-000000000001'''
\set staff2_id '''a1b2c3d4-0002-4000-8000-000000000002'''
\set user1_id  '''a1b2c3d4-0003-4000-8000-000000000001'''
\set user2_id  '''a1b2c3d4-0003-4000-8000-000000000002'''

-- Customers
\set cust1_id '''a1b2c3d4-0004-4000-8000-000000000001'''
\set cust2_id '''a1b2c3d4-0004-4000-8000-000000000002'''
\set cust3_id '''a1b2c3d4-0004-4000-8000-000000000003'''
\set cust4_id '''a1b2c3d4-0004-4000-8000-000000000004'''
\set cust5_id '''a1b2c3d4-0004-4000-8000-000000000005'''

-- --------------------------------------------------------------------------
-- 1. Organization
-- --------------------------------------------------------------------------
insert into public.organizations (id, name, type, settings)
values (
  :org_id,
  'La Estro 代官山',
  'salon',
  '{
    "address": "東京都渋谷区代官山町14-23",
    "phone": "03-1234-5678",
    "business_hours": {"open": "10:00", "close": "20:00"},
    "holidays": ["Tuesday"]
  }'::jsonb
);

-- --------------------------------------------------------------------------
-- 2. Staff
-- --------------------------------------------------------------------------

-- In a real environment, create auth.users first.
-- For local dev with `supabase start`, you can insert directly:
insert into auth.users (id, email, raw_user_meta_data, role, aud, created_at, updated_at)
values
  (:user1_id, 'yuki.tanaka@laestro.jp',
   '{"full_name": "田中 悠希"}'::jsonb, 'authenticated', 'authenticated', now(), now()),
  (:user2_id, 'misa.suzuki@laestro.jp',
   '{"full_name": "鈴木 美咲"}'::jsonb, 'authenticated', 'authenticated', now(), now())
on conflict (id) do nothing;

insert into public.staff (id, org_id, user_id, name, role, email)
values
  (:staff1_id, :org_id, :user1_id, '田中 悠希', 'owner',   'yuki.tanaka@laestro.jp'),
  (:staff2_id, :org_id, :user2_id, '鈴木 美咲', 'stylist', 'misa.suzuki@laestro.jp');

-- --------------------------------------------------------------------------
-- 3. Customers
-- --------------------------------------------------------------------------
insert into public.customers (id, org_id, name, name_kana, phone, email, profile, tags)
values
  (:cust1_id, :org_id, '佐藤 花子', 'サトウ ハナコ', '090-1111-0001', 'hanako@example.com',
   '{"hair_type": "straight", "scalp": "normal", "allergies": []}'::jsonb,
   array['常連', 'カラー']),

  (:cust2_id, :org_id, '高橋 健太', 'タカハシ ケンタ', '090-1111-0002', null,
   '{"hair_type": "wavy", "scalp": "oily", "allergies": ["ジアミン"]}'::jsonb,
   array['メンズ']),

  (:cust3_id, :org_id, '渡辺 美月', 'ワタナベ ミヅキ', '090-1111-0003', 'mizuki.w@example.com',
   '{"hair_type": "curly", "scalp": "dry", "allergies": []}'::jsonb,
   array['常連', 'パーマ', 'トリートメント']),

  (:cust4_id, :org_id, '伊藤 大輝', 'イトウ ダイキ', '090-1111-0004', null,
   '{"hair_type": "straight", "scalp": "normal", "allergies": []}'::jsonb,
   array['メンズ', '新規']),

  (:cust5_id, :org_id, '中村 さくら', 'ナカムラ サクラ', '090-1111-0005', 'sakura.n@example.com',
   '{"hair_type": "straight", "scalp": "sensitive", "allergies": ["パラベン"]}'::jsonb,
   array['常連', 'ヘッドスパ']);

-- --------------------------------------------------------------------------
-- 4. Sample Appointments (this week)
-- --------------------------------------------------------------------------
insert into public.appointments (org_id, customer_id, staff_id, start_time, end_time, status, service_type, notes)
values
  (:org_id, :cust1_id, :staff1_id,
   now() + interval '1 day' + time '10:00', now() + interval '1 day' + time '11:30',
   'scheduled', 'カット＋カラー', '前回と同じアッシュベージュ希望'),

  (:org_id, :cust2_id, :staff2_id,
   now() + interval '1 day' + time '13:00', now() + interval '1 day' + time '14:00',
   'scheduled', 'カット', null),

  (:org_id, :cust3_id, :staff1_id,
   now() + interval '2 days' + time '11:00', now() + interval '2 days' + time '13:00',
   'scheduled', 'パーマ＋トリートメント', 'ゆるふわパーマ希望、ダメージケア重視'),

  (:org_id, :cust5_id, :staff2_id,
   now() + interval '2 days' + time '15:00', now() + interval '2 days' + time '16:00',
   'scheduled', 'ヘッドスパ', '肩こりがひどいとのこと'),

  (:org_id, :cust4_id, :staff1_id,
   now() - interval '1 day' + time '14:00', now() - interval '1 day' + time '15:00',
   'completed', 'カット', '初来店 — ツーブロック');

-- --------------------------------------------------------------------------
-- 5. Sample Karute Record (for the completed appointment)
-- --------------------------------------------------------------------------
insert into public.karute_records (customer_id, staff_id, org_id, ai_summary, status)
values (
  :cust4_id, :staff1_id, :org_id,
  '初来店の男性客。ツーブロックを希望。サイドは6mm、トップは長めに残してナチュラルに仕上げた。' ||
  'ワックスでのスタイリング方法をレクチャー。次回は1ヶ月後を推奨。',
  'approved'
);

-- Entries for that karute
insert into public.karute_entries (karute_id, category, content, confidence)
select
  kr.id,
  e.category,
  e.content,
  e.confidence
from public.karute_records kr,
(values
  ('treatment',        'ツーブロック — サイド6mm、トップ7cm残し',  0.95),
  ('preference',       'ナチュラルな仕上がりが好み',              0.88),
  ('product',          'マットワックス推奨（ナカノ スタイリングワックス4）', 0.80),
  ('next_appointment', '約1ヶ月後にメンテナンスカット',           0.90)
) as e(category, content, confidence)
where kr.customer_id = :cust4_id;
