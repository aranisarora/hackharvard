-- PathForge Database Schema
-- Run this in Supabase SQL Editor to create all tables

-- ============================================
-- 1) MENTORS (no dependencies, create first)
-- ============================================
CREATE TABLE IF NOT EXISTS mentors (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  title           text,
  company         text,
  email           text,
  profile_image_url text,
  description     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 2) USERS (references cvs and roadmaps, but we add FKs later)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id                    uuid PRIMARY KEY,              -- matches auth.users.id
  email                 text NOT NULL UNIQUE,
  name                  text,
  -- Onboarding / targeting
  target_position       text,
  target_company        text,
  location              text,
  age                   text,
  salary_range          text,
  time_per_week         text,
  target_date           date,
  geographic_mobility   text,
  onboarding_status     text NOT NULL DEFAULT 'not_started', -- not_started | in_progress | completed
  -- Active resources (FKs added later)
  active_cv_id          uuid,
  active_roadmap_id     uuid,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 3) CVS
-- ============================================
CREATE TABLE IF NOT EXISTS cvs (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  onboarding_snapshot  jsonb,          -- optional: snapshot of answers when this CV was generated
  current_cv_text      text NOT NULL,
  target_cv_text       text NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cvs_user_id ON cvs(user_id);

-- Unique constraint for upsert operations (one active CV per user at a time)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cvs_user_id_unique ON cvs(user_id) WHERE id = (SELECT active_cv_id FROM users WHERE users.id = cvs.user_id);

-- ============================================
-- 4) ROADMAPS
-- ============================================
CREATE TABLE IF NOT EXISTS roadmaps (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cv_id                uuid REFERENCES cvs(id) ON DELETE SET NULL,
  target_job_title     text,
  target_company       text,
  overall_progress     integer NOT NULL DEFAULT 0,  -- 0–100, can be derived but nice to cache
  status               text NOT NULL DEFAULT 'in_use', -- in_use | archived
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roadmaps_user_id ON roadmaps(user_id);

-- ============================================
-- 5) TASKS
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id      uuid NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  category        text NOT NULL,   -- Education, Certifications, Course, Skills, Experience, Portfolio, Networking, Interview Prep, etc.
  title           text NOT NULL,
  description     text NOT NULL,
  deadline        date,
  start_date      date,
  end_date        date,
  is_completed    boolean NOT NULL DEFAULT false,
  course_link     text,            -- URL for Course tasks
  is_linked       boolean NOT NULL DEFAULT false, -- external course account linked
  mentor_id       uuid REFERENCES mentors(id),
  order_index     integer NOT NULL DEFAULT 0,
  source          text NOT NULL DEFAULT 'ai',   -- e.g. ai_batch1 | ai_batch2 | manual
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_roadmap_id ON tasks(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);

-- ============================================
-- 6) TASK_CHECKLIST_ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS task_checklist_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  text            text NOT NULL,
  is_completed    boolean NOT NULL DEFAULT false,
  link            text,         -- optional URL (required by app logic for Course tasks)
  order_index     integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_checklist_items_task_id ON task_checklist_items(task_id);

-- ============================================
-- 7) ADD FOREIGN KEY BACK-REFERENCES TO USERS
-- ============================================
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_active_cv_id_fkey;

ALTER TABLE users
  ADD CONSTRAINT users_active_cv_id_fkey
  FOREIGN KEY (active_cv_id) REFERENCES cvs(id) ON DELETE SET NULL;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_active_roadmap_id_fkey;

ALTER TABLE users
  ADD CONSTRAINT users_active_roadmap_id_fkey
  FOREIGN KEY (active_roadmap_id) REFERENCES roadmaps(id) ON DELETE SET NULL;

-- ============================================
-- 8) ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cvs ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentors ENABLE ROW LEVEL SECURITY;

-- Users: can only access their own row
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- CVs: can only access own CVs
CREATE POLICY "Users can view own CVs" ON cvs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own CVs" ON cvs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own CVs" ON cvs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own CVs" ON cvs
  FOR DELETE USING (auth.uid() = user_id);

-- Roadmaps: can only access own roadmaps
CREATE POLICY "Users can view own roadmaps" ON roadmaps
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own roadmaps" ON roadmaps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own roadmaps" ON roadmaps
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own roadmaps" ON roadmaps
  FOR DELETE USING (auth.uid() = user_id);

-- Tasks: can access tasks in own roadmaps
CREATE POLICY "Users can view own tasks" ON tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM roadmaps
      WHERE roadmaps.id = tasks.roadmap_id
      AND roadmaps.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own tasks" ON tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM roadmaps
      WHERE roadmaps.id = tasks.roadmap_id
      AND roadmaps.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM roadmaps
      WHERE roadmaps.id = tasks.roadmap_id
      AND roadmaps.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own tasks" ON tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM roadmaps
      WHERE roadmaps.id = tasks.roadmap_id
      AND roadmaps.user_id = auth.uid()
    )
  );

-- Task checklist items: can access items in own tasks
CREATE POLICY "Users can view own checklist items" ON task_checklist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN roadmaps ON roadmaps.id = tasks.roadmap_id
      WHERE tasks.id = task_checklist_items.task_id
      AND roadmaps.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own checklist items" ON task_checklist_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN roadmaps ON roadmaps.id = tasks.roadmap_id
      WHERE tasks.id = task_checklist_items.task_id
      AND roadmaps.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own checklist items" ON task_checklist_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN roadmaps ON roadmaps.id = tasks.roadmap_id
      WHERE tasks.id = task_checklist_items.task_id
      AND roadmaps.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own checklist items" ON task_checklist_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN roadmaps ON roadmaps.id = tasks.roadmap_id
      WHERE tasks.id = task_checklist_items.task_id
      AND roadmaps.user_id = auth.uid()
    )
  );

-- Mentors: everyone can read (public catalog)
CREATE POLICY "Anyone can view mentors" ON mentors
  FOR SELECT USING (true);

-- ============================================
-- 9) HELPER FUNCTION: Auto-create user on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user row when auth.users row is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
