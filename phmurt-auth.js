// ═══════════════════════════════════════════════════════
// PHMURT STUDIOS — AUTH + CHARACTER STORAGE
// Local-first character storage with safer Supabase session sync.
// Cloud is treated as the account source when available.
// ═══════════════════════════════════════════════════════

const PhmurtDB = (function(){
  'use strict';

  function hashPw(pw){
    let h=0; for(let i=0;i<pw.length;i++){h=((h<<5)-h)+pw.charCodeAt(i);h|=0;}
    return h.toString(36)+'_'+btoa(pw.length+'x'+pw.split('').reverse().join('').slice(0,4));
  }

  function lsGet(k){ try{return JSON.parse(localStorage.getItem(k));}catch(e){return null;} }
  function lsSet(k,v){ localStorage.setItem(k,JSON.stringify(v)); }
  function lsRemove(k){ localStorage.removeItem(k); }

  const USERS_KEY = 'phmurt_users';
  const SESSION_KEY = 'phmurt_session';
  const CHARS_PREFIX = 'phmurt_chars_';

  let _sb = null;
  let _cloudInitPromise = null;
  let _authListenerBound = false;

  function sb(){
    if(_sb) return _sb;
    if(typeof PHMURT_CONFIG === 'undefined' || !PHMURT_CONFIG.cloudEnabled) return null;
    if(typeof window.supabase === 'undefined') return null;
    try{ _sb = window.supabase.createClient(PHMURT_CONFIG.supabaseUrl, PHMURT_CONFIG.supabaseAnonKey); }
    catch(e){ console.warn('Supabase init failed', e); }
    return _sb;
  }

  function isCloudEnabled(){
    return typeof PHMURT_CONFIG !== 'undefined' && !!PHMURT_CONFIG.cloudEnabled;
  }

  function nowMs(){ return Date.now(); }

  function toMs(value){
    if(value === null || value === undefined || value === '') return 0;
    if(typeof value === 'number' && isFinite(value)) return value;
    const parsed = Date.parse(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  function firstName(name, fallbackEmail){
    const base = (name || '').trim() || ((fallbackEmail || '').split('@')[0] || 'Adventurer');
    return base;
  }

  function buildSessionFromUser(user, fallbackName){
    if(!user) return null;
    return {
      userId: user.id,
      name: firstName(user.user_metadata?.name || fallbackName || user.email, user.email),
      email: user.email || '',
      provider: 'supabase'
    };
  }

  function getSession(){ return lsGet(SESSION_KEY); }

  function getLocalUserByEmail(email){
    if(!email) return null;
    const users = lsGet(USERS_KEY) || [];
    return users.find(u => u.email === email) || null;
  }

  function getLocalUserById(userId){
    if(!userId) return null;
    const users = lsGet(USERS_KEY) || [];
    return users.find(u => u.id === userId) || null;
  }

  function setSession(session, notify){
    if(session) lsSet(SESSION_KEY, session);
    else lsRemove(SESSION_KEY);
    if(typeof updateNavAuth === 'function') updateNavAuth();
    if(notify && typeof window.onAuthChange === 'function') window.onAuthChange(session || null);
  }

  function saveLocalUserProfile(profile){
    if(!profile || !profile.email) return;
    const users = lsGet(USERS_KEY) || [];
    const idx = users.findIndex(u => u.email === profile.email);
    const next = {
      ...(idx >= 0 ? users[idx] : {}),
      id: profile.id,
      name: profile.name,
      email: profile.email,
      created: (idx >= 0 && users[idx].created) ? users[idx].created : nowMs(),
      provider: profile.provider || (isCloudEnabled() ? 'supabase' : 'local')
    };
    if(profile.pwHash) next.pwHash = profile.pwHash;
    if(idx >= 0) users[idx] = next;
    else users.push(next);
    lsSet(USERS_KEY, users);
  }

  async function initCloudAuth(){
    const client = sb();
    if(!client) return null;
    if(_cloudInitPromise) return _cloudInitPromise;

    _cloudInitPromise = (async function(){
      if(!_authListenerBound){
        _authListenerBound = true;
        client.auth.onAuthStateChange(function(event, session){
          if(event === 'PASSWORD_RECOVERY'){
            document.documentElement.dataset.phmurtRecovery = 'true';
          }

          if(session && session.user){
            const nextSession = buildSessionFromUser(session.user);
            if(nextSession){
              saveLocalUserProfile({
                id: nextSession.userId,
                name: nextSession.name,
                email: nextSession.email,
                provider: 'supabase'
              });
              setSession(nextSession, event !== 'INITIAL_SESSION');
            }
          } else if(event === 'SIGNED_OUT'){
            setSession(null, true);
          }
        });
      }

      try {
        const result = await client.auth.getSession();
        const cloudSession = result && result.data ? result.data.session : null;
        if(cloudSession && cloudSession.user){
          const nextSession = buildSessionFromUser(cloudSession.user);
          if(nextSession){
            saveLocalUserProfile({
              id: nextSession.userId,
              name: nextSession.name,
              email: nextSession.email,
              provider: 'supabase'
            });
            setSession(nextSession, false);
          }
        }
      } catch(e){
        console.warn('Supabase session restore failed:', e && e.message ? e.message : e);
      }

      return client;
    })();

    return _cloudInitPromise;
  }

  function localCharsKey(userId){ return CHARS_PREFIX + userId; }

  function deriveEdition(data){
    if(data && data.edition) return String(data.edition);
    return '5e';
  }

  function deriveLevel(data){
    if(!data) return 1;
    if(typeof data.level === 'number' && isFinite(data.level)) return data.level;
    if(typeof data.level === 'string' && data.level.trim() !== '' && !isNaN(parseInt(data.level,10))) return parseInt(data.level,10);
    if(Array.isArray(data.classes) && data.classes.length){
      const total = data.classes.reduce(function(sum, cls){
        const value = parseInt(cls && cls.level, 10);
        return sum + (isNaN(value) ? 0 : value);
      }, 0);
      if(total > 0) return total;
    }
    return 1;
  }

  function normalizeCharacterRecord(raw, userId){
    if(!raw) return null;
    const data = raw.data || raw;
    const updated = toMs(raw.updated || raw.updated_at || data.savedAt || raw.created || raw.created_at) || nowMs();
    const created = toMs(raw.created || raw.created_at) || updated;
    return {
      id: raw.id || ('c_' + nowMs() + '_' + Math.random().toString(36).slice(2)),
      userId: raw.userId || userId || null,
      name: raw.name || (data.details && data.details.name) || 'Unnamed Adventurer',
      race: raw.race !== undefined ? raw.race : (data.race || null),
      cls: raw.cls !== undefined ? raw.cls : (data.cls || null),
      level: raw.level !== undefined ? raw.level : deriveLevel(data),
      edition: raw.edition || deriveEdition(data),
      data: data,
      created: created,
      updated: updated,
      _pendingSync: !!raw._pendingSync
    };
  }

  function normalizeRemoteRow(row){
    if(!row) return null;
    return normalizeCharacterRecord({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      race: row.data && row.data.race ? row.data.race : null,
      cls: row.data && row.data.cls ? row.data.cls : null,
      level: row.data && row.data.level !== undefined ? row.data.level : undefined,
      edition: row.data && row.data.edition ? row.data.edition : undefined,
      data: row.data,
      created_at: row.created_at,
      updated_at: row.updated_at,
      _pendingSync: false
    }, row.user_id);
  }

  function sortCharacters(chars){
    return (chars || []).slice().sort(function(a,b){ return (b.updated||0) - (a.updated||0); });
  }

  function readLocalCharacters(userId){
    return sortCharacters(((lsGet(localCharsKey(userId)) || [])
      .map(function(c){ return normalizeCharacterRecord(c, userId); })
      .filter(Boolean)));
  }

  function writeLocalCharacters(userId, chars){
    lsSet(localCharsKey(userId), sortCharacters((chars || []).map(function(c){ return normalizeCharacterRecord(c, userId); }).filter(Boolean)));
  }

  function choosePreferredCharacter(a, b){
    if(!a) return b;
    if(!b) return a;
    const au = a.updated || 0;
    const bu = b.updated || 0;
    if(au !== bu) return au > bu ? a : b;
    if(a._pendingSync !== b._pendingSync) return a._pendingSync ? a : b;
    return a;
  }

  function mergeCharacterLists(localChars, remoteChars, userId){
    const map = new Map();
    (remoteChars || []).forEach(function(char){
      const normalized = normalizeCharacterRecord(char, userId);
      if(normalized) map.set(normalized.id, normalized);
    });
    (localChars || []).forEach(function(char){
      const normalized = normalizeCharacterRecord(char, userId);
      if(!normalized) return;
      map.set(normalized.id, choosePreferredCharacter(normalized, map.get(normalized.id)));
    });
    return sortCharacters(Array.from(map.values()));
  }

  function needsCloudPush(localChar, remoteMap){
    if(!localChar) return false;
    if(localChar._pendingSync) return true;
    const remoteChar = remoteMap.get(localChar.id);
    if(!remoteChar) return true;
    return (localChar.updated || 0) > ((remoteChar.updated || 0) + 1000);
  }

  async function getCloudSession(){
    const client = await initCloudAuth();
    if(!client) return null;
    try {
      const result = await client.auth.getSession();
      return result && result.data ? result.data.session : null;
    } catch(e){
      console.warn('Supabase auth session unavailable:', e && e.message ? e.message : e);
      return null;
    }
  }

  async function uploadCharacterToCloud(client, session, char){
    if(!client || !session || !char) return false;
    const row = {
      id: char.id,
      user_id: session.userId,
      name: char.name,
      data: char.data,
      created_at: new Date(char.created || char.updated || nowMs()).toISOString(),
      updated_at: new Date(char.updated || nowMs()).toISOString()
    };
    try {
      const result = await client.from('characters').upsert(row, { onConflict: 'id' });
      if(result && result.error){
        console.warn('Supabase save failed, keeping local copy:', result.error.message || result.error);
        return false;
      }
      return true;
    } catch(e){
      console.warn('Supabase save exception:', e && e.message ? e.message : e);
      return false;
    }
  }

  async function fetchRemoteCharacters(client, session){
    if(!client || !session) return [];
    const result = await client
      .from('characters')
      .select('*')
      .eq('user_id', session.userId)
      .order('updated_at', {ascending:false});
    if(result && result.error) throw result.error;
    return Array.isArray(result.data) ? result.data.map(normalizeRemoteRow).filter(Boolean) : [];
  }

  function isNetworkishAuthError(error){
    const msg = ((error && error.message) || error || '').toString().toLowerCase();
    return msg.includes('fetch') || msg.includes('network') || msg.includes('timeout') || msg.includes('failed to fetch');
  }

  function getResetPasswordUrl(){
    try { return new URL('reset-password.html', window.location.href).toString(); }
    catch(e){ return window.location.origin + '/reset-password.html'; }
  }

  async function signup(name, email, password){
    email = (email || '').toLowerCase().trim();
    name = (name || '').trim();
    if(!name||!email||!password) return {error:'All fields required.'};
    if(password.length < 6) return {error:'Password must be at least 6 characters.'};
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return {error:'Invalid email address.'};

    const client = sb();
    if(client){
      try {
        await initCloudAuth();
        const result = await client.auth.signUp({email, password, options:{data:{name}}});
        if(result.error) return {error: result.error.message};
        const user = result.data && result.data.user ? result.data.user : null;
        if(!user) return {error:'Account could not be created.'};
        saveLocalUserProfile({ id:user.id, name:name, email:email, provider:'supabase' });

        if(result.data.session){
          const session = buildSessionFromUser(user, name);
          setSession(session, false);
          return {user: session};
        }

        return {pendingConfirmation:true, message:'Check your email to confirm your account, then sign in.'};
      } catch(e){
        if(!isNetworkishAuthError(e)) return {error: (e && e.message) ? e.message : 'Account could not be created.'};
      }
    }

    const users = lsGet(USERS_KEY)||[];
    if(users.find(u=>u.email===email)) return {error:'An account with that email already exists.'};
    const user = { id:'u_'+nowMs()+'_'+Math.random().toString(36).slice(2), name, email, pwHash:hashPw(password), created:nowMs(), provider:'local' };
    users.push(user);
    lsSet(USERS_KEY, users);
    const session = {userId:user.id, name:user.name, email:user.email, provider:user.provider || 'local'};
    setSession(session, false);
    return {user:session};
  }

  async function login(email, password){
    email = (email || '').toLowerCase().trim();
    if(!email||!password) return {error:'Email and password required.'};

    const client = sb();
    if(client){
      try {
        await initCloudAuth();
        const result = await client.auth.signInWithPassword({email,password});
        if(result.error){
          if(!isNetworkishAuthError(result.error)) return {error:'Invalid email or password.'};
        } else if(result.data && result.data.user){
          const session = buildSessionFromUser(result.data.user);
          saveLocalUserProfile({ id:session.userId, name:session.name, email:session.email, provider:'supabase' });
          setSession(session, false);
          return {user:session};
        }
      } catch(e){
        if(!isNetworkishAuthError(e)) return {error:'Invalid email or password.'};
      }
    }

    const users = lsGet(USERS_KEY)||[];
    const user = users.find(u=>u.email===email && u.pwHash);
    if(!user||user.pwHash!==hashPw(password)) return {error:'Invalid email or password.'};
    const session = {userId:user.id, name:user.name, email:user.email, provider:user.provider || 'local'};
    setSession(session, false);
    return {user:session};
  }

  async function logout(){
    const client = sb();
    setSession(null, false);
    if(client){
      try { await client.auth.signOut(); }
      catch(e){ console.warn('Supabase sign-out failed:', e && e.message ? e.message : e); }
    }
    window.location.reload();
  }

  function getSessionProvider(session){
    if(session && session.provider) return session.provider;
    const localProfile = session ? (getLocalUserById(session.userId) || getLocalUserByEmail(session.email)) : null;
    return (localProfile && localProfile.provider) || (isCloudEnabled() ? 'supabase' : 'local');
  }

  function getPendingSyncCount(session){
    if(!session) return 0;
    return readLocalCharacters(session.userId).filter(function(char){ return !!char._pendingSync; }).length;
  }

  async function getStatus(){
    const session = getSession();
    const provider = getSessionProvider(session);
    const client = sb();
    let cloudSessionActive = false;
    if(client){
      const cloudSession = await getCloudSession();
      cloudSessionActive = !!(cloudSession && cloudSession.user);
    }
    const pendingSyncCount = getPendingSyncCount(session);
    const cloudConfigured = isCloudEnabled();
    const cloudAvailable = !!client;
    let modeLabel = 'Signed out';
    let syncLabel = 'No account session';

    if(session){
      if(provider === 'supabase'){
        modeLabel = cloudSessionActive ? 'Cloud-backed account' : 'Cloud account (offline cache)';
        if(pendingSyncCount > 0) syncLabel = pendingSyncCount + ' change' + (pendingSyncCount === 1 ? '' : 's') + ' waiting to sync';
        else syncLabel = cloudSessionActive ? 'Synced to cloud' : 'Using local cache until cloud reconnects';
      } else {
        modeLabel = 'Browser-only account';
        syncLabel = cloudConfigured ? 'Saved only in this browser' : 'Cloud sync disabled for this site';
      }
    }

    return {
      signedIn: !!session,
      session: session,
      provider: provider,
      cloudConfigured: cloudConfigured,
      cloudAvailable: cloudAvailable,
      cloudSessionActive: cloudSessionActive,
      pendingSyncCount: pendingSyncCount,
      modeLabel: modeLabel,
      syncLabel: syncLabel,
      canSync: !!session && provider === 'supabase',
      canResetPassword: provider === 'supabase' && cloudAvailable
    };
  }

  async function syncPendingCharacters(){
    const session = getSession();
    if(!session) return {error:'Not logged in.'};
    await loadCharacters();
    const status = await getStatus();
    return {
      success: true,
      pendingSyncCount: status.pendingSyncCount,
      modeLabel: status.modeLabel,
      syncLabel: status.syncLabel
    };
  }

  async function saveCharacter(charData, existingId){
    const session = getSession();
    if(!session) return {error:'Not logged in.'};

    const localChars = readLocalCharacters(session.userId);
    const prior = existingId ? localChars.find(c => c.id === existingId) : null;
    const char = normalizeCharacterRecord({
      id: existingId || (prior && prior.id) || ('c_' + nowMs() + '_' + Math.random().toString(36).slice(2)),
      userId: session.userId,
      name: charData && charData.details && charData.details.name ? charData.details.name : ((prior && prior.name) || 'Unnamed Adventurer'),
      race: charData ? charData.race : null,
      cls: charData ? charData.cls : null,
      level: deriveLevel(charData),
      edition: deriveEdition(charData),
      data: charData,
      created: prior ? prior.created : nowMs(),
      updated: nowMs(),
      _pendingSync: false
    }, session.userId);

    const nextLocal = mergeCharacterLists(localChars.filter(c => c.id !== char.id).concat([char]), [], session.userId);
    writeLocalCharacters(session.userId, nextLocal);

    const client = sb();
    let pendingSync = false;
    const provider = getSessionProvider(session);
    if(client){
      const cloudSession = await getCloudSession();
      if(cloudSession && cloudSession.user){
        const ok = await uploadCharacterToCloud(client, session, char);
        pendingSync = !ok;
      } else if(provider === 'supabase') {
        pendingSync = true;
      }
    } else if(provider === 'supabase' && isCloudEnabled()) {
      pendingSync = true;
    }

    if(pendingSync){
      char._pendingSync = true;
      writeLocalCharacters(session.userId, nextLocal.filter(c => c.id !== char.id).concat([char]));
    }

    const status = await getStatus();
    return {id:char.id, success:true, pendingSync:pendingSync, modeLabel:status.modeLabel, syncLabel:status.syncLabel};
  }

  async function loadCharacters(){
    const session = getSession();
    if(!session) return [];

    let localChars = readLocalCharacters(session.userId);
    const client = sb();
    if(!client) return localChars;

    const cloudSession = await getCloudSession();
    if(!cloudSession || !cloudSession.user) return localChars;

    try {
      const remoteChars = await fetchRemoteCharacters(client, session);
      const remoteMap = new Map(remoteChars.map(c => [c.id, c]));
      let merged = mergeCharacterLists(localChars, remoteChars, session.userId);

      let changed = false;
      for(const char of merged){
        if(needsCloudPush(char, remoteMap)){
          const ok = await uploadCharacterToCloud(client, session, char);
          if(ok){
            if(char._pendingSync){
              char._pendingSync = false;
              changed = true;
            }
          } else if(!char._pendingSync){
            char._pendingSync = true;
            changed = true;
          }
        }
      }

      if(changed){
        merged = merged.map(function(char){ return normalizeCharacterRecord(char, session.userId); });
      }
      writeLocalCharacters(session.userId, merged);
      return merged;
    } catch(e){
      console.warn('Supabase character sync skipped:', e && e.message ? e.message : e);
      return localChars;
    }
  }

  async function deleteCharacter(id){
    const session = getSession();
    if(!session) return {error:'Not logged in.'};
    writeLocalCharacters(session.userId, readLocalCharacters(session.userId).filter(c => c.id !== id));

    const client = sb();
    if(client){
      const cloudSession = await getCloudSession();
      if(cloudSession && cloudSession.user){
        try {
          const result = await client.from('characters').delete().eq('id', id).eq('user_id', session.userId);
          if(result && result.error) console.warn('Supabase delete failed:', result.error.message || result.error);
        } catch(e){
          console.warn('Supabase delete exception:', e && e.message ? e.message : e);
        }
      }
    }

    return {success:true};
  }


async function renameCharacter(id, newName){
  const session = getSession();
  if(!session) return { error:'Not logged in.' };
  const cleanName = String(newName || '').trim();
  if(!cleanName) return { error:'Please provide a character name.' };

  const chars = await loadCharacters();
  const existing = chars.find(char => char.id === id);
  if(!existing) return { error:'Character not found.' };

  const updatedData = JSON.parse(JSON.stringify(existing.data || {}));
  updatedData.details = updatedData.details || {};
  updatedData.details.name = cleanName;
  updatedData.name = cleanName;
  return saveCharacter(updatedData, id);
}

async function duplicateCharacter(id, options){
  const session = getSession();
  if(!session) return { error:'Not logged in.' };
  options = options || {};

  const chars = await loadCharacters();
  const existing = chars.find(char => char.id === id);
  if(!existing) return { error:'Character not found.' };

  const copyData = JSON.parse(JSON.stringify(existing.data || {}));
  copyData.details = copyData.details || {};
  const requestedName = String(options.name || '').trim();
  copyData.details.name = requestedName || ((existing.name || 'Unnamed Adventurer') + ' Copy');
  copyData.name = copyData.details.name;

  const result = await saveCharacter(copyData);
  if(result && result.id){
    const localChars = readLocalCharacters(session.userId);
    const clone = localChars.find(char => char.id === result.id);
    if(clone){
      clone.created = nowMs();
      clone.updated = nowMs();
      clone.sourceCharacterId = id;
      writeLocalCharacters(session.userId, sortCharacters(localChars.map(char => char.id === clone.id ? clone : char)));
    }
  }
  return result;
}


  function sanitizeImportCharacter(raw, userId){
    const normalized = normalizeCharacterRecord(raw, userId);
    if(!normalized || !normalized.data) return null;
    normalized.userId = userId;
    normalized.name = normalized.name || 'Unnamed Adventurer';
    normalized.level = deriveLevel(normalized.data);
    normalized.edition = deriveEdition(normalized.data);
    normalized.updated = normalized.updated || nowMs();
    normalized.created = normalized.created || normalized.updated;
    normalized._pendingSync = true;
    return normalized;
  }

  async function exportCharacters(options){
    const session = getSession();
    if(!session) return { error: 'Not logged in.' };
    const chars = await loadCharacters();
    const payload = {
      format: 'phmurt-character-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      site: 'Phmurt Studios',
      count: chars.length,
      characters: chars.map(function(char){
        return {
          id: char.id,
          name: char.name,
          race: char.race,
          cls: char.cls,
          level: char.level,
          edition: char.edition,
          created: char.created,
          updated: char.updated,
          data: char.data
        };
      })
    };

    if(options && options.download){
      const stamp = new Date().toISOString().slice(0,19).replace(/[T:]/g,'-');
      const filename = 'phmurt-characters-backup-' + stamp + '.json';
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
    }

    return payload;
  }

  async function importCharacters(payload, options){
    const session = getSession();
    if(!session) return { error: 'Not logged in.' };
    options = options || {};

    const list = Array.isArray(payload)
      ? payload
      : (payload && Array.isArray(payload.characters) ? payload.characters : null);
    if(!list) return { error: 'Import file is not in a supported format.' };

    const sanitized = list.map(function(char){ return sanitizeImportCharacter(char, session.userId); }).filter(Boolean);
    if(!sanitized.length) return { error: 'No valid characters were found in that file.' };

    const existing = readLocalCharacters(session.userId);
    const existingMap = new Map(existing.map(function(char){ return [char.id, char]; }));
    let importedCount = 0;
    let replacedCount = 0;
    let skippedCount = 0;

    sanitized.forEach(function(char){
      const existingChar = existingMap.get(char.id);
      if(options.mode === 'replace'){
        existingMap.set(char.id, char);
        importedCount += 1;
        if(existingChar) replacedCount += 1;
        return;
      }
      if(!existingChar){
        existingMap.set(char.id, char);
        importedCount += 1;
        return;
      }
      const preferred = choosePreferredCharacter(char, existingChar);
      if(preferred === char){
        existingMap.set(char.id, char);
        importedCount += 1;
        replacedCount += 1;
      } else {
        skippedCount += 1;
      }
    });

    const merged = sortCharacters(Array.from(existingMap.values()));
    writeLocalCharacters(session.userId, merged);

    let syncedCount = 0;
    if(options.sync !== false){
      const client = sb();
      const cloudSession = client ? await getCloudSession() : null;
      if(client && cloudSession && cloudSession.user){
        for(const char of merged){
          if(!char._pendingSync) continue;
          const ok = await uploadCharacterToCloud(client, session, char);
          if(ok){
            char._pendingSync = false;
            syncedCount += 1;
          }
        }
        writeLocalCharacters(session.userId, merged);
      }
    }

    return {
      success: true,
      importedCount: importedCount,
      replacedCount: replacedCount,
      skippedCount: skippedCount,
      syncedCount: syncedCount,
      totalCount: merged.length
    };
  }

  async function loadCharacter(id){
    const session = getSession();
    if(!session) return null;

    const localChars = readLocalCharacters(session.userId);
    const localChar = localChars.find(c => c.id === id) || null;
    const client = sb();
    if(!client) return localChar ? localChar.data : null;

    const cloudSession = await getCloudSession();
    if(!cloudSession || !cloudSession.user) return localChar ? localChar.data : null;

    try {
      const result = await client.from('characters').select('*').eq('id',id).eq('user_id', session.userId).maybeSingle();
      if(result && result.error) throw result.error;
      const remoteChar = result && result.data ? normalizeRemoteRow(result.data) : null;

      if(remoteChar){
        const chosen = choosePreferredCharacter(localChar, remoteChar);
        const merged = mergeCharacterLists(localChars.filter(c => c.id !== id).concat([chosen]), [], session.userId);
        writeLocalCharacters(session.userId, merged);
        if(chosen === localChar && needsCloudPush(localChar, new Map([[remoteChar.id, remoteChar]]))){
          const ok = await uploadCharacterToCloud(client, session, localChar);
          if(ok && localChar._pendingSync){
            localChar._pendingSync = false;
            writeLocalCharacters(session.userId, localChars);
          } else if(!ok && !localChar._pendingSync){
            localChar._pendingSync = true;
            writeLocalCharacters(session.userId, localChars);
          }
        }
        return chosen ? chosen.data : null;
      }

      if(localChar && localChar._pendingSync){
        const ok = await uploadCharacterToCloud(client, session, localChar);
        if(ok){
          localChar._pendingSync = false;
          writeLocalCharacters(session.userId, localChars);
        }
      }
    } catch(e){
      console.warn('loadCharacter Supabase failed:', e && e.message ? e.message : e);
    }

    return localChar ? localChar.data : null;
  }

  function buildAuthModal(){
    if(document.getElementById('phmurt-auth-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'phmurt-auth-modal';
    modal.innerHTML = `
      <div class="pam-overlay" onclick="PhmurtDB.closeAuth()"></div>
      <div class="pam-box">
        <button class="pam-close" onclick="PhmurtDB.closeAuth()">✕</button>
        <div class="pam-logo">⚔ Phmurt Studios</div>
        <div class="pam-tabs">
          <button class="pam-tab active" onclick="PhmurtDB.authTab('login')">Sign In</button>
          <button class="pam-tab" onclick="PhmurtDB.authTab('signup')">Create Account</button>
          <button class="pam-tab" onclick="PhmurtDB.authTab('forgot')">Reset Password</button>
        </div>
        <div id="pam-login" class="pam-form">
          <div class="pam-field"><label>Email</label><input type="email" id="pam-login-email" placeholder="you@example.com" /></div>
          <div class="pam-field"><label>Password</label><input type="password" id="pam-login-pw" placeholder="••••••••" /></div>
          <div class="pam-error" id="pam-login-err"></div>
          <button class="pam-submit" onclick="PhmurtDB.doLogin()">Sign In</button>
          <div style="text-align:center;margin-top:10px;">
            <button onclick="PhmurtDB.authTab('forgot')" style="background:none;border:none;font-family:'Cinzel',serif;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);cursor:pointer;transition:color .2s;" onmouseover="this.style.color='var(--crimson)'" onmouseout="this.style.color='var(--text-muted)'">Forgot Password?</button>
          </div>
        </div>
        <div id="pam-signup" class="pam-form" style="display:none">
          <div class="pam-field"><label>Name</label><input type="text" id="pam-signup-name" placeholder="Adventurer name" /></div>
          <div class="pam-field"><label>Email</label><input type="email" id="pam-signup-email" placeholder="you@example.com" /></div>
          <div class="pam-field"><label>Password</label><input type="password" id="pam-signup-pw" placeholder="Min. 6 characters" /></div>
          <div class="pam-error" id="pam-signup-err"></div>
          <button class="pam-submit" onclick="PhmurtDB.doSignup()">Create Account</button>
        </div>
        <div id="pam-forgot" class="pam-form" style="display:none">
          <div style="font-size:14px;color:var(--text-dim);font-style:italic;line-height:1.7;margin-bottom:16px;">Enter your email and we'll send you a link to reset your password.</div>
          <div class="pam-field"><label>Email</label><input type="email" id="pam-forgot-email" placeholder="you@example.com" /></div>
          <div class="pam-error" id="pam-forgot-err"></div>
          <button class="pam-submit" onclick="PhmurtDB.doForgotPassword()">Send Reset Link</button>
          <div style="text-align:center;margin-top:12px;">
            <button onclick="PhmurtDB.authTab('login')" style="background:none;border:none;font-family:'Cinzel',serif;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);cursor:pointer;">← Back to Sign In</button>
          </div>
        </div>
        <div class="pam-note">${isCloudEnabled() ? 'Accounts use secure email sign-in through Supabase. Characters stay cached locally and sync to the cloud when you are signed in.' : 'Cloud sync is disabled. Accounts and characters are saved only in this browser.'}</div>
      </div>`;
    document.body.appendChild(modal);

    modal.querySelectorAll('input').forEach(function(inp){
      inp.addEventListener('keydown',function(e){
        if(e.key !== 'Enter') return;
        const form = inp.closest('.pam-form');
        if(!form) return;
        if(form.id === 'pam-login') return PhmurtDB.doLogin();
        if(form.id === 'pam-signup') return PhmurtDB.doSignup();
        if(form.id === 'pam-forgot') return PhmurtDB.doForgotPassword();
      });
    });
  }

  function openAuth(){ buildAuthModal(); document.getElementById('phmurt-auth-modal').classList.add('open'); }
  function closeAuth(){ const m=document.getElementById('phmurt-auth-modal'); if(m) m.classList.remove('open'); }
  function authTab(tab){
    document.querySelectorAll('.pam-tab').forEach(function(t,i){ t.classList.toggle('active',['login','signup','forgot'][i]===tab); });
    const loginEl = document.getElementById('pam-login');
    const signupEl = document.getElementById('pam-signup');
    const forgotEl = document.getElementById('pam-forgot');
    if(loginEl) loginEl.style.display = tab==='login' ? 'block' : 'none';
    if(signupEl) signupEl.style.display = tab==='signup' ? 'block' : 'none';
    if(forgotEl) forgotEl.style.display = tab==='forgot' ? 'block' : 'none';
  }

  async function doForgotPassword(){
    const email=(document.getElementById('pam-forgot-email') || {}).value ? document.getElementById('pam-forgot-email').value.trim() : '';
    const errEl=document.getElementById('pam-forgot-err');
    if(!errEl) return;
    if(!email){errEl.textContent='Please enter your email.';return;}
    errEl.textContent='Sending...';

    const client=sb();
    const session = getSession();
    const provider = getSessionProvider(session);
    if(!client || provider === 'local'){
      errEl.textContent='Password reset email is only available for cloud-backed accounts.';
      return;
    }
    if(client){
      try {
        await initCloudAuth();
        const result = await client.auth.resetPasswordForEmail(email,{ redirectTo: getResetPasswordUrl() });
        if(result.error){errEl.textContent=result.error.message;return;}
      } catch(e){
        errEl.textContent=(e && e.message) ? e.message : 'Could not send reset link.';
        return;
      }
    }
    errEl.style.color='#4CAF50';
    errEl.textContent='✓ Reset link sent! Check your email.';
    document.getElementById('pam-forgot-email').value='';
    setTimeout(function(){ errEl.style.color=''; errEl.textContent=''; },5000);
  }

  async function doLogin(){
    const email=(document.getElementById('pam-login-email') || {}).value || '';
    const pw=(document.getElementById('pam-login-pw') || {}).value || '';
    const errEl=document.getElementById('pam-login-err');
    if(!errEl) return;
    errEl.textContent='Signing in...';
    const r=await login(email,pw);
    if(r.error){errEl.textContent=r.error;return;}
    errEl.textContent='';
    closeAuth();
    updateNavAuth();
    if(typeof window.onAuthChange==='function') window.onAuthChange(r.user || getSession());
  }

  async function doSignup(){
    const name=(document.getElementById('pam-signup-name') || {}).value || '';
    const email=(document.getElementById('pam-signup-email') || {}).value || '';
    const pw=(document.getElementById('pam-signup-pw') || {}).value || '';
    const errEl=document.getElementById('pam-signup-err');
    if(!errEl) return;
    errEl.textContent='Creating account...';
    const r=await signup(name,email,pw);
    if(r.error){errEl.textContent=r.error;return;}
    if(r.pendingConfirmation){
      errEl.style.color='#4CAF50';
      errEl.textContent=r.message || 'Check your email to confirm your account.';
      authTab('login');
      return;
    }
    errEl.textContent='';
    closeAuth();
    updateNavAuth();
    if(typeof window.onAuthChange==='function') window.onAuthChange(r.user || getSession());
  }

  async function updateNavAuth(){
    const session=getSession();
    const btn=document.getElementById('nav-auth-btn');
    const dropdown=document.getElementById('nav-user-dropdown');
    if(!btn) return;
    if(session){
      const status = await getStatus();
      btn.textContent=firstName(session.name, session.email).split(' ')[0];
      btn.onclick=function(){ if(dropdown) dropdown.classList.toggle('open'); };
      if(dropdown){
        const syncAction = status.canSync ? `<button onclick="PhmurtDB.handleNavSync(event)">Sync Now</button>` : '';
        dropdown.innerHTML=`
          <div style="padding:10px 12px 8px;border-bottom:1px solid rgba(160,30,30,.18);line-height:1.45;">
            <div style="font-family:'Cinzel',serif;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px;">${status.modeLabel}</div>
            <div style="font-size:13px;color:var(--text-dim);font-style:italic;">${status.syncLabel}</div>
          </div>
          <a href="my-characters.html">My Characters</a>
          ${syncAction}
          <button onclick="PhmurtDB.logout()">Sign Out</button>`;
      }
    } else {
      btn.textContent='Sign In';
      btn.onclick=function(){ PhmurtDB.openAuth(); };
      if(dropdown) dropdown.innerHTML='';
    }
  }

  async function handleNavSync(event){
    if(event && typeof event.preventDefault === 'function') event.preventDefault();
    if(event && typeof event.stopPropagation === 'function') event.stopPropagation();
    const dropdown=document.getElementById('nav-user-dropdown');
    if(dropdown){
      const syncButton = dropdown.querySelector('button');
      if(syncButton) syncButton.textContent = 'Syncing...';
    }
    await syncPendingCharacters();
    await updateNavAuth();
    if(typeof window.onAuthChange === 'function') window.onAuthChange(getSession());
  }

  document.addEventListener('DOMContentLoaded', function(){
    updateNavAuth();
    initCloudAuth();
  });

  return {
    signup, login, logout, getSession,
    saveCharacter, loadCharacters, loadCharacter, deleteCharacter, renameCharacter, duplicateCharacter, exportCharacters, importCharacters,
    openAuth, closeAuth, authTab, doLogin, doSignup, doForgotPassword,
    updateNavAuth, initCloudAuth, getStatus, syncPendingCharacters, handleNavSync
  };
})();
