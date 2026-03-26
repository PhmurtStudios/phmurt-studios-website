/* ═══════════════════════════════════════════════════════════════════
   SUPABASE CONFIG – Phmurt Studios
   ═══════════════════════════════════════════════════════════════════
   SETUP:
     1. Go to https://supabase.com → your project → Settings → API
     2. Copy "Project URL"    → paste into SUPABASE_URL below
     3. Copy "anon / public"  → paste into SUPABASE_ANON_KEY below
     4. Save and reload — cloud auth and data sync activate automatically.
   ═══════════════════════════════════════════════════════════════════ */

var SUPABASE_URL      = 'https://zrfmboqoyrqsyckktgpv.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_Uvg-qACdL7dowGKbkH0dLA_m2R3Vamy';

/* ── Initialise the Supabase client ────────────────────────────────
   Requires the supabase-js CDN <script> to be loaded before this file.
   Falls back gracefully to local-storage mode when not configured.   ─────────────────────────────────────────────────────────────────── */
var phmurtSupabase = null;

(function () {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  if (typeof window === 'undefined' || typeof window.supabase === 'undefined') return;
  try {
    phmurtSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession:     true,
        autoRefreshToken:   true,
        detectSessionInUrl: true,
        storageKey:         'phmurt_sb_auth'
      }
    });
    console.info('[Phmurt] Supabase client ready.');
  } catch (e) {
    console.warn('[Phmurt] Supabase init failed – running in offline mode.', e);
  }
})();
