-- ═══════════════════════════════════════════════════════════════════
-- PHMURT STUDIOS — Supabase Database Setup (v3 – fixes RLS recursion)
-- Run this ONCE in: Dashboard → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════

-- ── 0. Fix pre-existing characters table column name ────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'characters'
      AND column_name  = 'user_id'
  ) THEN
    ALTER TABLE public.characters RENAME COLUMN user_id TO owner_id;
  END IF;
END $$;

-- ── 1. Security-definer helper (avoids infinite recursion) ───────
-- This function reads profiles WITHOUT triggering RLS, so policies
-- that call it don't loop back into themselves.
CREATE OR REPLACE FUNCTION public.phmurt_is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1),
    false
  );
$$;

-- ── 2. Profiles ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name          text,
  email         text,
  is_admin      boolean DEFAULT false,
  is_superuser  boolean DEFAULT false,
  is_banned     boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_superuser boolean DEFAULT false;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read"      ON public.profiles;
DROP POLICY IF EXISTS "Own update"       ON public.profiles;
DROP POLICY IF EXISTS "Admin all"        ON public.profiles;
DROP POLICY IF EXISTS "Insert own"       ON public.profiles;
DROP POLICY IF EXISTS "Admin update all" ON public.profiles;
DROP POLICY IF EXISTS "Admin delete all" ON public.profiles;

-- Anyone can read any profile (display names, etc.)
CREATE POLICY "Public read"      ON public.profiles FOR SELECT USING (true);
-- Users can insert their own profile (used by the signup trigger)
CREATE POLICY "Insert own"       ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
-- Users can update their own profile
CREATE POLICY "Own update"       ON public.profiles FOR UPDATE USING (auth.uid() = id);
-- Admins can update ANY profile (uses definer function — no recursion)
CREATE POLICY "Admin update all" ON public.profiles FOR UPDATE USING (public.phmurt_is_admin());
-- Admins can delete ANY profile
CREATE POLICY "Admin delete all" ON public.profiles FOR DELETE USING (public.phmurt_is_admin());

-- ── 3. Characters ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.characters (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name         text,
  race         text,
  class        text,
  level        integer DEFAULT 1,
  builder_type text DEFAULT '5e',
  data         jsonb NOT NULL DEFAULT '{}',
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own access"            ON public.characters;
DROP POLICY IF EXISTS "Admin read characters" ON public.characters;

CREATE POLICY "Own access"            ON public.characters FOR ALL    USING (auth.uid() = owner_id);
CREATE POLICY "Admin read characters" ON public.characters FOR SELECT USING (public.phmurt_is_admin());

-- ── 4. Campaigns ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.campaigns (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  data       jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own access"           ON public.campaigns;
DROP POLICY IF EXISTS "Admin read campaigns" ON public.campaigns;

CREATE POLICY "Own access"           ON public.campaigns FOR ALL    USING (auth.uid() = owner_id);
CREATE POLICY "Admin read campaigns" ON public.campaigns FOR SELECT USING (public.phmurt_is_admin());

-- ── 5. Site visits ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_visits (
  id         bigserial PRIMARY KEY,
  page       text,
  user_id    uuid,
  visited_at timestamptz DEFAULT now()
);
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon insert" ON public.site_visits;
DROP POLICY IF EXISTS "Admin read"  ON public.site_visits;

CREATE POLICY "Anon insert" ON public.site_visits FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin read"  ON public.site_visits FOR SELECT USING (public.phmurt_is_admin());

-- ── 6. Auto-create profile on signup ─────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════════
-- Done! Now open supabase-setup-admin.html in your browser.
-- ═══════════════════════════════════════════════════════════════════
