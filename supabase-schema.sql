-- ============================================================
-- SLM MARKETPLACE — DATABASE SCHEMA (PostgreSQL / Supabase)
-- ============================================================
-- Run this in Supabase SQL Editor to provision all tables,
-- indexes, row-level security policies, and triggers.
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLE: users
-- Engineer / user profiles. Mirrors auth.users via id FK.
-- ============================================================
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  name text not null,
  email text unique not null,
  avatar_letter text,
  avatar_color text default '#6B7280',
  title text,
  bio text,
  location text,
  github_url text,
  join_date timestamptz default now(),
  is_verified boolean default false,
  follower_count integer default 0,
  score integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_users_username on users(username);
create index if not exists idx_users_score on users(score desc);

-- ============================================================
-- TABLE: models
-- ============================================================
create table if not exists models (
  id bigint generated always as identity primary key,
  title text not null,
  short_description text not null check (char_length(short_description) <= 160),
  full_description text,
  category text not null check (category in (
    'legal','healthcare','coding','finance','general',
    'education','multilingual','security'
  )),
  engineer_id uuid references users(id) on delete cascade,
  engineer_username text,                 -- denormalized for fast reads
  github_url text,
  tags text[] default '{}',
  accuracy numeric(5,2),
  f1_score numeric(5,2),
  response_time integer,                  -- milliseconds
  model_size text,
  context_window text,
  quantized boolean default false,
  base_model text,
  languages text default 'English',
  license text default 'MIT',
  training_data text,
  download_count integer default 0,
  view_count integer default 0,
  rating numeric(2,1) default 0,
  status text default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_models_category on models(category);
create index if not exists idx_models_engineer on models(engineer_id);
create index if not exists idx_models_created on models(created_at desc);
create index if not exists idx_models_downloads on models(download_count desc);
create index if not exists idx_models_status on models(status);
create index if not exists idx_models_tags on models using gin(tags);

-- Full-text search index
alter table models add column if not exists search_vector tsvector
  generated always as (
    to_tsvector('english', coalesce(title,'') || ' ' || coalesce(short_description,''))
  ) stored;
create index if not exists idx_models_search on models using gin(search_vector);

-- ============================================================
-- TABLE: reviews
-- ============================================================
create table if not exists reviews (
  id bigint generated always as identity primary key,
  model_id bigint references models(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now(),
  unique(model_id, user_id)   -- one review per user per model
);

create index if not exists idx_reviews_model on reviews(model_id);
create index if not exists idx_reviews_user on reviews(user_id);

-- ============================================================
-- TABLE: bookmarks
-- ============================================================
create table if not exists bookmarks (
  id bigint generated always as identity primary key,
  model_id bigint references models(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  saved_at timestamptz default now(),
  unique(model_id, user_id)
);

create index if not exists idx_bookmarks_user on bookmarks(user_id);

-- ============================================================
-- TABLE: downloads
-- ============================================================
create table if not exists downloads (
  id bigint generated always as identity primary key,
  model_id bigint references models(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  downloaded_at timestamptz default now()
);

create index if not exists idx_downloads_model on downloads(model_id);

-- ============================================================
-- TABLE: activity
-- ============================================================
create table if not exists activity (
  id bigint generated always as identity primary key,
  user_id uuid references users(id) on delete cascade,
  action_type text not null check (action_type in (
    'upload','update','review_received','follow','milestone'
  )),
  target_id bigint,
  target_name text,
  created_at timestamptz default now()
);

create index if not exists idx_activity_user on activity(user_id, created_at desc);

-- ============================================================
-- TRIGGERS: keep rating + updated_at in sync
-- ============================================================

-- Recalculate a model's average rating whenever reviews change
create or replace function recalc_model_rating() returns trigger as $$
begin
  update models
  set rating = coalesce((
    select round(avg(rating)::numeric, 1)
    from reviews
    where model_id = coalesce(new.model_id, old.model_id)
  ), 0)
  where id = coalesce(new.model_id, old.model_id);
  return null;
end;
$$ language plpgsql;

drop trigger if exists trg_recalc_rating on reviews;
create trigger trg_recalc_rating
after insert or update or delete on reviews
for each row execute function recalc_model_rating();

-- Auto-update updated_at on models
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_models_updated_at on models;
create trigger trg_models_updated_at
before update on models
for each row execute function set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table users enable row level security;
alter table models enable row level security;
alter table reviews enable row level security;
alter table bookmarks enable row level security;
alter table downloads enable row level security;
alter table activity enable row level security;

-- USERS: anyone can read, only the owner can update their own row
create policy "users_select_all" on users for select using (true);
create policy "users_update_own" on users for update using (auth.uid() = id);
create policy "users_insert_own" on users for insert with check (auth.uid() = id);

-- MODELS: published models are public; owners can manage their own (incl. drafts)
create policy "models_select_published" on models for select
  using (status = 'published' or engineer_id = auth.uid());
create policy "models_insert_own" on models for insert
  with check (engineer_id = auth.uid());
create policy "models_update_own" on models for update
  using (engineer_id = auth.uid());
create policy "models_delete_own" on models for delete
  using (engineer_id = auth.uid());

-- REVIEWS: public read, authenticated users can write their own
create policy "reviews_select_all" on reviews for select using (true);
create policy "reviews_insert_own" on reviews for insert with check (auth.uid() = user_id);
create policy "reviews_update_own" on reviews for update using (auth.uid() = user_id);
create policy "reviews_delete_own" on reviews for delete using (auth.uid() = user_id);

-- BOOKMARKS: private to the owner
create policy "bookmarks_select_own" on bookmarks for select using (auth.uid() = user_id);
create policy "bookmarks_insert_own" on bookmarks for insert with check (auth.uid() = user_id);
create policy "bookmarks_delete_own" on bookmarks for delete using (auth.uid() = user_id);

-- DOWNLOADS: insert-only, publicly loggable (anonymized), no read needed by clients
create policy "downloads_insert_all" on downloads for insert with check (true);

-- ACTIVITY: public read (used on profile pages), owner-only write
create policy "activity_select_all" on activity for select using (true);
create policy "activity_insert_own" on activity for insert with check (auth.uid() = user_id);


-- ============================================================
-- RPC: Atomic view/download counter (prevents race conditions)
-- M1 fix: increment_view_count called from JS instead of
-- read-then-write which can produce duplicate increments
-- ============================================================
create or replace function increment_view_count(model_id bigint)
returns void as $$
begin
  update models set view_count = view_count + 1 where id = model_id;
end;
$$ language plpgsql security definer;

create or replace function increment_download_count(model_id bigint)
returns void as $$
begin
  update models set download_count = download_count + 1 where id = model_id;
  -- Also log to downloads table for analytics
  insert into downloads (model_id, user_id, downloaded_at)
  values (model_id, auth.uid(), now());
end;
$$ language plpgsql security definer;

-- Allow anon/authed users to call these RPCs
grant execute on function increment_view_count(bigint) to anon, authenticated;
grant execute on function increment_download_count(bigint) to anon, authenticated;

-- ============================================================
-- RPC: Update engineer score after model/review changes
-- M2 fix: score stored in DB, not recalculated on every client load
-- ============================================================
create or replace function recalc_engineer_score(eng_id uuid)
returns void as $$
declare
  dl_count bigint;
  avg_rat  numeric;
  mod_count int;
begin
  select
    coalesce(sum(download_count), 0),
    coalesce(avg(rating), 0),
    count(*)
  into dl_count, avg_rat, mod_count
  from models
  where engineer_id = eng_id and status = 'published';

  update users set
    score = round(
      (log(greatest(dl_count, 1)) * 100) +
      ((avg_rat / 5.0) * 300) +
      least(mod_count * 20, 400)
    ),
    total_downloads = dl_count
  where id = eng_id;
end;
$$ language plpgsql security definer;

-- Trigger: recalc score when a model's downloads or rating changes
create or replace function trg_recalc_score() returns trigger as $$
begin
  perform recalc_engineer_score(coalesce(new.engineer_id, old.engineer_id));
  return null;
end;
$$ language plpgsql;

drop trigger if exists trg_model_score on models;
create trigger trg_model_score
after insert or update or delete on models
for each row execute function trg_recalc_score();


-- ============================================================
-- TABLE: follows  (M4 fix)
-- ============================================================
create table if not exists follows (
  id bigint generated always as identity primary key,
  follower_id uuid references users(id) on delete cascade,
  following_id uuid references users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(follower_id, following_id)
);

create index if not exists idx_follows_follower on follows(follower_id);
create index if not exists idx_follows_following on follows(following_id);

alter table follows enable row level security;
create policy "follows_select_all" on follows for select using (true);
create policy "follows_insert_own" on follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete_own" on follows for delete using (auth.uid() = follower_id);

-- RPCs for follow/unfollow with follower_count sync
create or replace function follow_engineer(target_id uuid) returns void as $$
begin
  insert into follows (follower_id, following_id) values (auth.uid(), target_id)
  on conflict do nothing;
  update users set follower_count = follower_count + 1 where id = target_id;
end;
$$ language plpgsql security definer;

create or replace function unfollow_engineer(target_id uuid) returns void as $$
begin
  delete from follows where follower_id = auth.uid() and following_id = target_id;
  update users set follower_count = greatest(follower_count - 1, 0) where id = target_id;
end;
$$ language plpgsql security definer;

grant execute on function follow_engineer(uuid) to authenticated;
grant execute on function unfollow_engineer(uuid) to authenticated;

-- ============================================================
-- SEED DATA (optional — for local development/demo)
-- Comment out before deploying to production.
-- ============================================================
-- insert into models (title, short_description, category, engineer_username, ...)
-- values (...);
