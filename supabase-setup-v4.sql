-- ═══════════════════════════════════════════════════════════════════
-- PHMURT STUDIOS — Supabase Backend v4
-- Run in: Dashboard → SQL Editor → New query → Run
--
-- What this adds on top of v3:
--   • encounter_templates  — cloud-synced encounter templates per campaign
--   • campaign_invites     — invite codes so players can join campaigns
--   • battle_map_snapshots — persisted map state (players loading mid-session)
--   • Storage bucket setup — map-images and portraits buckets
--   • Realtime enabled on battle_map_snapshots
--   • Updated campaign policies to allow member read access
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Encounter Templates ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.encounter_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  owner_id    uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name        text NOT NULL,
  data        jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
ALTER TABLE public.encounter_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own or member read" ON public.encounter_templates;
DROP POLICY IF EXISTS "Owner write"        ON public.encounter_templates;
DROP POLICY IF EXISTS "Admin all"          ON public.encounter_templates;

-- Campaign owner or members can read templates
CREATE POLICY "Own or member read" ON public.encounter_templates FOR SELECT
  USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM public.campaign_members
      WHERE campaign_id = encounter_templates.campaign_id
        AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE id = encounter_templates.campaign_id
        AND owner_id = auth.uid()
    )
  );

-- Only owner can write
CREATE POLICY "Owner write" ON public.encounter_templates FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Admins can read all
CREATE POLICY "Admin all" ON public.encounter_templates FOR SELECT
  USING (public.phmurt_is_admin());

-- ── 2. Campaign Members ──────────────────────────────────────────
-- Tracks which users are members of which campaigns
CREATE TABLE IF NOT EXISTS public.campaign_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id     uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  role        text DEFAULT 'player',   -- 'player' | 'dm'
  joined_at   timestamptz DEFAULT now(),
  UNIQUE(campaign_id, user_id)
);
ALTER TABLE public.campaign_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Member self read"     ON public.campaign_members;
DROP POLICY IF EXISTS "Campaign owner read"  ON public.campaign_members;
DROP POLICY IF EXISTS "Campaign owner write" ON public.campaign_members;
DROP POLICY IF EXISTS "Self delete"          ON public.campaign_members;

CREATE POLICY "Member self read" ON public.campaign_members FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Campaign owner read" ON public.campaign_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE id = campaign_members.campaign_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Campaign owner write" ON public.campaign_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE id = campaign_members.campaign_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Self delete" ON public.campaign_members FOR DELETE
  USING (auth.uid() = user_id);

-- ── 3. Campaign Invite Codes ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.campaign_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  owner_id    uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  code        text UNIQUE NOT NULL DEFAULT substring(md5(random()::text) from 1 for 8),
  max_uses    integer DEFAULT 10,
  use_count   integer DEFAULT 0,
  expires_at  timestamptz DEFAULT (now() + interval '30 days'),
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE public.campaign_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read by code" ON public.campaign_invites;
DROP POLICY IF EXISTS "Owner manage"        ON public.campaign_invites;

-- Anyone can read invite metadata (needed to join by code)
CREATE POLICY "Public read by code" ON public.campaign_invites FOR SELECT
  USING (true);

-- Only owner can create/delete invite codes
CREATE POLICY "Owner manage" ON public.campaign_invites FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- ── 4. Battle Map Snapshots ──────────────────────────────────────
-- Stores the current live battle map state per campaign so players
-- can load it when joining mid-session
CREATE TABLE IF NOT EXISTS public.battle_map_snapshots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL UNIQUE,
  owner_id    uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  state       jsonb NOT NULL DEFAULT '{}',
  updated_at  timestamptz DEFAULT now()
);
ALTER TABLE public.battle_map_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "DM write snapshot"     ON public.battle_map_snapshots;
DROP POLICY IF EXISTS "Member read snapshot"  ON public.battle_map_snapshots;

-- Only campaign owner (DM) can write the snapshot
CREATE POLICY "DM write snapshot" ON public.battle_map_snapshots FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Campaign members can read the current snapshot
CREATE POLICY "Member read snapshot" ON public.battle_map_snapshots FOR SELECT
  USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM public.campaign_members
      WHERE campaign_id = battle_map_snapshots.campaign_id
        AND user_id = auth.uid()
    )
  );

-- Enable real-time on this table so players get live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_map_snapshots;

-- ── 5. Update Campaigns table for member access ──────────────────
-- Members should be able to read campaigns they belong to
DROP POLICY IF EXISTS "Member read campaign" ON public.campaigns;

CREATE POLICY "Member read campaign" ON public.campaigns FOR SELECT
  USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM public.campaign_members
      WHERE campaign_id = campaigns.id AND user_id = auth.uid()
    )
  );

-- ── 6. Function: Join campaign by invite code ────────────────────
CREATE OR REPLACE FUNCTION public.join_campaign_by_code(invite_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  inv   record;
  camp  record;
  uid   uuid := auth.uid();
BEGIN
  -- Find valid, non-expired invite
  SELECT * INTO inv
  FROM public.campaign_invites
  WHERE code = invite_code
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR use_count < max_uses)
  LIMIT 1;

  IF inv IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invite code');
  END IF;

  -- Get campaign info
  SELECT * INTO camp FROM public.campaigns WHERE id = inv.campaign_id;

  -- Add member (ignore if already a member)
  INSERT INTO public.campaign_members (campaign_id, user_id, role)
  VALUES (inv.campaign_id, uid, 'player')
  ON CONFLICT (campaign_id, user_id) DO NOTHING;

  -- Increment use count
  UPDATE public.campaign_invites
  SET use_count = use_count + 1
  WHERE id = inv.id;

  RETURN jsonb_build_object(
    'success', true,
    'campaign_id', inv.campaign_id,
    'campaign_name', (camp.data->>'name')
  );
END;
$$;

-- ── 7. Function: Upsert battle map snapshot ──────────────────────
CREATE OR REPLACE FUNCTION public.upsert_battle_map(
  p_campaign_id uuid,
  p_state       jsonb
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.battle_map_snapshots (campaign_id, owner_id, state)
  VALUES (p_campaign_id, auth.uid(), p_state)
  ON CONFLICT (campaign_id)
  DO UPDATE SET state = p_state, updated_at = now()
  WHERE battle_map_snapshots.owner_id = auth.uid();
END;
$$;

-- ── 8. Storage buckets ───────────────────────────────────────────
-- Run these in the Dashboard → Storage → Create Bucket if the SQL
-- INSERT below doesn't work (storage API may differ per Supabase version)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('map-images', 'map-images', false, 10485760,  -- 10MB limit
   ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('portraits',  'portraits',  false, 5242880,   -- 5MB limit
   ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can manage their own files
DROP POLICY IF EXISTS "User upload map-images"   ON storage.objects;
DROP POLICY IF EXISTS "User read map-images"     ON storage.objects;
DROP POLICY IF EXISTS "User upload portraits"    ON storage.objects;
DROP POLICY IF EXISTS "User read portraits"      ON storage.objects;

CREATE POLICY "User upload map-images" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'map-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "User read map-images" ON storage.objects FOR SELECT
  USING (bucket_id = 'map-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "User upload portraits" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'portraits' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "User read portraits" ON storage.objects FOR SELECT
  USING (bucket_id = 'portraits' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "User delete own files" ON storage.objects FOR DELETE
  USING (auth.uid()::text = (storage.foldername(name))[1]);

-- ── 9. Indexes for performance ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_campaign_members_user     ON public.campaign_members(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_members_campaign ON public.campaign_members(campaign_id);
CREATE INDEX IF NOT EXISTS idx_encounter_templates_camp  ON public.encounter_templates(campaign_id);
CREATE INDEX IF NOT EXISTS idx_battle_map_campaign       ON public.battle_map_snapshots(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_invites_code     ON public.campaign_invites(code);

-- ═══════════════════════════════════════════════════════════════════
-- Done! Steps after running this:
--   1. Go to Supabase Dashboard → Realtime → enable "battle_map_snapshots"
--      (or it may already be enabled via the ALTER PUBLICATION above)
--   2. That's it — the site code handles everything else.
-- ═══════════════════════════════════════════════════════════════════
