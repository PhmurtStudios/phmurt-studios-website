# Supabase Setup — Phmurt Studios Cloud Characters

Without Supabase, accounts and characters still work — they're saved to the 
browser's localStorage. Supabase adds cloud sync so players can access their 
characters from any device.

## 5-Minute Setup

### 1. Create a free Supabase account
Go to **https://supabase.com** and sign up (free forever tier).

### 2. Create a new project
- Name it `phmurt-studios` (or anything)
- Set a database password (save it somewhere)
- Choose the region closest to you

### 3. Create the characters table
In your Supabase dashboard, go to **SQL Editor** and run this:

```sql
CREATE TABLE characters (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row-level security: users can only see their own characters
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own characters"
  ON characters FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 4. Get your credentials
In Supabase dashboard → **Settings** → **API**:
- Copy **Project URL** (looks like `https://abcdef.supabase.co`)
- Copy **anon / public** key (long string starting with `eyJ...`)

### 5. Update supabase-config.js
Open `supabase-config.js` and fill in:

```javascript
const PHMURT_CONFIG = {
  supabaseUrl:     'https://YOUR_PROJECT_ID.supabase.co',
  supabaseAnonKey: 'eyJhbGci...',
  cloudEnabled: true   // ← change this to true
};
```

### 6. Enable Email Auth
In Supabase dashboard → **Authentication** → **Providers**:
- Make sure **Email** is enabled
- For a small fan site, you can disable email confirmation:
  **Authentication** → **Settings** → uncheck "Enable email confirmations"

### 7. Upload to GitHub Pages
Upload `supabase-config.js` along with your other files.

That's it! Characters will now sync to the cloud.

---

## Without Supabase
Everything works with localStorage only — characters are saved in the browser.
Players just can't access their characters from a different device.
