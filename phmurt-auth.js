// ═══════════════════════════════════════════════════════
// PHMURT STUDIOS — AUTH + CHARACTER STORAGE
// Local-first accounts + character storage with optional API/Supabase sync.
// Canonical session is mirrored across legacy keys so all pages stay in sync.
// ═══════════════════════════════════════════════════════

const PhmurtDB = (function(){
  'use strict';

  const USERS_KEY = 'phmurt_users';
  const USERS_DB_KEY = 'phmurt_users_db';
  const SESSION_KEYS = ['phmurt_session', 'phmurt_auth_session', 'phmurt_admin_session'];
  const SESSION_KEY = SESSION_KEYS[0];
  const CHARS_PREFIX = 'phmurt_chars_';
  const IMAGE_SECRET_PREFIX = 'phmurt_image_secret_';
  const ADMIN_EMAILS = ['dreverad18@gmail.com'];
  const DEFAULT_ADMIN_EMAIL = 'dreverad18@gmail.com';
  const DEFAULT_ADMIN_PASSWORD = '+diceGoblin18';
  const DEFAULT_ADMIN_NAME = 'Aaron Drever';
  const LEGACY_ADMIN_HASH = '0526e1d92389b37ccf3d6eac71daaff8db4db23737e5f17045fbd3ba3e7481f8';
  const AUTH_CHANNEL_NAME = 'phmurt-auth';

  let _sb = null;
  let _channel = null;

  function lsGetRaw(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
  function lsSetRaw(k,v){ try { localStorage.setItem(k, v); } catch(e){} }
  function lsRemove(k){ try { localStorage.removeItem(k); } catch(e){} }
  function lsGet(k){ try { const raw = lsGetRaw(k); return raw ? JSON.parse(raw) : null; } catch(e){ return null; } }
  function lsSet(k,v){ lsSetRaw(k, JSON.stringify(v)); }

  function apiBase(){ return (typeof PHMURT_CONFIG !== 'undefined' && PHMURT_CONFIG.apiBaseUrl ? String(PHMURT_CONFIG.apiBaseUrl).replace(/\/$/,'') : ''); }
  function defaultTenantSlug(){ return (localStorage.getItem('phmurt_default_tenant_slug') || (typeof PHMURT_CONFIG !== 'undefined' && PHMURT_CONFIG.defaultTenantSlug) || 'phmurt-studios').trim(); }

  function hashPwLegacy(pw){
    let h=0; for(let i=0;i<pw.length;i++){h=((h<<5)-h)+pw.charCodeAt(i);h|=0;}
    return h.toString(36)+'_'+btoa(pw.length+'x'+pw.split('').reverse().join('').slice(0,4));
  }

  async function hashPassword(email, password){
    const str = String(password || '') + ':' + String(email || '').trim().toLowerCase();
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return hashPwLegacy(str);
  }

  function createChannel(){
    if (_channel || typeof BroadcastChannel === 'undefined') return _channel;
    try {
      _channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
      _channel.onmessage = function(ev){
        if(!ev || !ev.data) return;
        if(ev.data.type === 'auth-changed') _handleExternalAuthChange();
      };
    } catch(e){}
    return _channel;
  }

  function broadcastAuthChange(){
    try { window.dispatchEvent(new Event('phmurt-auth-change')); } catch(e){}
    try { localStorage.setItem('phmurt_auth_changed_at', String(Date.now())); } catch(e){}
    try { const ch = createChannel(); if(ch) ch.postMessage({ type: 'auth-changed', at: Date.now() }); } catch(e){}
  }

  function _handleExternalAuthChange(){
    updateNavAuth();
    if(typeof window.onAuthChange === 'function'){
      try { window.onAuthChange(getSession()); } catch(e){}
    }
  }

  function isAdminEmail(email){
    return ADMIN_EMAILS.includes(String(email || '').trim().toLowerCase());
  }

  function enrichSession(session){
    if(!session) return null;
    if(session.userId && !session.id) session.id = session.userId;
    if(session.id && !session.userId) session.userId = session.id;
    if(!session.displayName && session.name) session.displayName = session.name;
    if(!session.name && session.displayName) session.name = session.displayName;
    const email = String(session.email || '').trim().toLowerCase();
    const perms = Array.isArray(session.permissions) ? session.permissions : [];
    session.email = email || session.email || '';
    session.isAdmin = !!(session.isAdmin === true || isAdminEmail(email) || perms.includes('*') || perms.includes('users:read') || perms.includes('tenants:read'));
    return session;
  }

  function readAnySession(){
    for(const key of SESSION_KEYS){
      const s = lsGet(key);
      if(s && (s.userId || s.id || s.email)) return enrichSession(s);
    }
    return null;
  }

  function persistSession(session){
    const s = enrichSession(session);
    if(!s) return null;
    SESSION_KEYS.forEach(key => lsSet(key, s));
    return s;
  }

  function clearSession(){
    SESSION_KEYS.forEach(lsRemove);
  }

  function getUsersMap(){
    const usersMap = {};
    const dbObj = lsGet(USERS_DB_KEY);
    if(dbObj && typeof dbObj === 'object' && !Array.isArray(dbObj)){
      Object.keys(dbObj).forEach(email => {
        const u = dbObj[email];
        if(u && u.email) usersMap[String(u.email).trim().toLowerCase()] = Object.assign({}, u);
      });
    }
    const arr = lsGet(USERS_KEY);
    if(Array.isArray(arr)){
      arr.forEach(u => {
        if(u && u.email) usersMap[String(u.email).trim().toLowerCase()] = Object.assign({}, u);
      });
    }
    return usersMap;
  }

  function saveUsersMap(usersMap){
    const ordered = Object.keys(usersMap).sort().reduce((acc, email) => { acc[email] = usersMap[email]; return acc; }, {});
    lsSet(USERS_DB_KEY, ordered);
    lsSet(USERS_KEY, Object.values(ordered));
  }

  function seedDefaultAdminAccount(){
    const users = getUsersMap();
    const email = DEFAULT_ADMIN_EMAIL;
    let changed = false;
    if(!users[email]){
      users[email] = {
        userId: 'admin_local_dreverad18',
        id: 'admin_local_dreverad18',
        name: DEFAULT_ADMIN_NAME,
        displayName: DEFAULT_ADMIN_NAME,
        email: email,
        pwHash: hashPwLegacy(DEFAULT_ADMIN_PASSWORD),
        passwordHash: LEGACY_ADMIN_HASH,
        legacyPasswordHash: hashPwLegacy(DEFAULT_ADMIN_PASSWORD),
        roles: ['admin'],
        permissions: ['*','users:read','users:update','roles:read','roles:update','permissions:read','clients:read','clients:update','tenants:read','tenants:update','keys:read','keys:revoke','system:rate-limits','audit:read'],
        createdAt: new Date().toISOString(),
        isAdmin: true
      };
      changed = true;
    } else {
      const admin = users[email];
      if(!admin.userId && !admin.id){ admin.userId = 'admin_local_dreverad18'; admin.id = 'admin_local_dreverad18'; changed = true; }
      if(!admin.name){ admin.name = DEFAULT_ADMIN_NAME; changed = true; }
      if(!admin.displayName){ admin.displayName = admin.name || DEFAULT_ADMIN_NAME; changed = true; }
      if(!admin.pwHash){ admin.pwHash = hashPwLegacy(DEFAULT_ADMIN_PASSWORD); changed = true; }
      if(!admin.passwordHash){ admin.passwordHash = LEGACY_ADMIN_HASH; changed = true; }
      if(!Array.isArray(admin.permissions) || !admin.permissions.length){ admin.permissions = ['*','users:read','tenants:read']; changed = true; }
      if(admin.isAdmin !== true){ admin.isAdmin = true; changed = true; }
    }
    if(changed) saveUsersMap(users);
  }

  function getUserByEmail(email){
    const users = getUsersMap();
    return users[String(email || '').trim().toLowerCase()] || null;
  }

  function upsertLocalUser(user){
    const users = getUsersMap();
    const email = String(user.email || '').trim().toLowerCase();
    users[email] = Object.assign({}, users[email] || {}, user, { email: email });
    saveUsersMap(users);
    return users[email];
  }

  function getSession(){
    const s = readAnySession();
    if(s) persistSession(s);
    return s;
  }

  function isApiSession(session){ return !!(session && session.accessToken && session.refreshToken); }

  function sb(){
    if(_sb) return _sb;
    if(typeof PHMURT_CONFIG === 'undefined' || !PHMURT_CONFIG.cloudEnabled) return null;
    const url = PHMURT_CONFIG.supabaseUrl || window.SUPABASE_URL || '';
    const key = PHMURT_CONFIG.supabaseAnonKey || window.SUPABASE_ANON_KEY || '';
    if(!url || !key || typeof window.supabase === 'undefined') return null;
    try {
      _sb = window.supabase.createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
    } catch(e) {
      console.warn('Supabase init failed', e);
      _sb = null;
    }
    return _sb;
  }

  async function apiAuth(path, payload){
    const base = apiBase();
    if(!base) return null;
    const res = await fetch(base + path, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    const data = await res.json().catch(()=>null);
    if(!res.ok) return {error:(data && (data.error||data.message)) || 'Authentication failed.'};
    return data;
  }

  function createLocalSessionFromUser(user, extra){
    const session = Object.assign({
      userId: user.userId || user.id || ('u_' + Date.now()),
      id: user.id || user.userId || ('u_' + Date.now()),
      name: user.displayName || user.name || user.email.split('@')[0],
      displayName: user.displayName || user.name || user.email.split('@')[0],
      email: String(user.email || '').trim().toLowerCase(),
      permissions: user.permissions || [],
      tenantSlug: defaultTenantSlug()
    }, extra || {});
    return persistSession(session);
  }

  async function bootstrapSupabaseSession(){
    const client = sb();
    if(!client) return null;
    try {
      const { data } = await client.auth.getSession();
      if(!data || !data.session || !data.session.user) return null;
      const u = data.session.user;
      const session = createLocalSessionFromUser({
        userId: u.id,
        id: u.id,
        name: (u.user_metadata && (u.user_metadata.name || u.user_metadata.display_name)) || (u.email || '').split('@')[0],
        displayName: (u.user_metadata && (u.user_metadata.name || u.user_metadata.display_name)) || (u.email || '').split('@')[0],
        email: u.email,
        permissions: []
      }, {
        accessToken: data.session.access_token || '',
        refreshToken: data.session.refresh_token || ''
      });
      return session;
    } catch(e){
      return null;
    }
  }

  async function signup(name, email, password){
    email = String(email || '').toLowerCase().trim();
    name = String(name || '').trim();
    if(!name || !email || !password) return {error:'All fields required.'};
    if(password.length < 8) return {error:'Password must be at least 8 characters.'};
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return {error:'Invalid email address.'};

    const base = apiBase();
    if(base){
      try {
        const data = await apiAuth('/auth/signup', { tenantSlug: defaultTenantSlug(), tenantName: defaultTenantSlug(), name, email, password });
        if(data && !data.error) return await login(email, password);
      } catch(e){}
    }

    const existing = getUserByEmail(email);
    if(existing) return {error:'An account with that email already exists.'};

    const uid = 'u_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    const localUser = {
      userId: uid,
      id: uid,
      name: name,
      displayName: name,
      email: email,
      createdAt: new Date().toISOString(),
      passwordHash: await hashPassword(email, password),
      pwHash: hashPwLegacy(password),
      permissions: isAdminEmail(email) ? ['*','users:read','tenants:read'] : [],
      isAdmin: isAdminEmail(email)
    };

    const client = sb();
    if(client){
      try {
        const { data, error } = await client.auth.signUp({ email, password, options:{ data:{ name } } });
        if(!error && data && data.user){
          localUser.userId = data.user.id;
          localUser.id = data.user.id;
        }
      } catch(e){}
    }

    upsertLocalUser(localUser);
    const session = createLocalSessionFromUser(localUser);
    broadcastAuthChange();
    return { user: session };
  }

  async function login(email, password){
    email = String(email || '').toLowerCase().trim();
    if(!email || !password) return {error:'Email and password required.'};

    const base = apiBase();
    if(base){
      try {
        const data = await apiAuth('/auth/login', { tenantSlug: defaultTenantSlug(), email, password });
        if(data && !data.error){
          const session = persistSession({
            userId:data.userId, id:data.userId, name:data.name, displayName:data.name, email:data.email,
            accessToken:data.accessToken, refreshToken:data.refreshToken,
            permissions:data.permissions||[], tenantSlug:defaultTenantSlug()
          });
          broadcastAuthChange();
          return { user: session };
        }
      } catch(e){}
    }

    const client = sb();
    if(client){
      try {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if(!error && data && data.user){
          const localUser = getUserByEmail(email) || {};
          const session = createLocalSessionFromUser({
            userId:data.user.id, id:data.user.id,
            name:(data.user.user_metadata && (data.user.user_metadata.name || data.user.user_metadata.display_name)) || localUser.name || email.split('@')[0],
            displayName:(data.user.user_metadata && (data.user.user_metadata.name || data.user.user_metadata.display_name)) || localUser.displayName || email.split('@')[0],
            email:data.user.email,
            permissions: localUser.permissions || []
          }, {
            accessToken:data.session && data.session.access_token || '',
            refreshToken:data.session && data.session.refresh_token || ''
          });
          broadcastAuthChange();
          return { user: session };
        }
      } catch(e){}
    }

    const user = getUserByEmail(email);
    if(!user) return {error:'Invalid email or password.'};

    const attemptedHash = await hashPassword(email, password);
    const legacyMatch = user.pwHash && user.pwHash === hashPwLegacy(password);
    const modernMatch = user.passwordHash && user.passwordHash === attemptedHash;
    const specialAdminMatch = email === DEFAULT_ADMIN_EMAIL && attemptedHash === LEGACY_ADMIN_HASH;
    if(!(legacyMatch || modernMatch || specialAdminMatch)) return {error:'Invalid email or password.'};

    if(!user.passwordHash || user.passwordHash !== attemptedHash){
      user.passwordHash = attemptedHash;
      user.pwHash = hashPwLegacy(password);
      upsertLocalUser(user);
    }

    const session = createLocalSessionFromUser(user);
    broadcastAuthChange();
    return { user: session };
  }

  async function logout(){
    const session = getSession();
    if(isApiSession(session) && apiBase()){
      fetch(apiBase() + '/auth/logout', {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.accessToken},
        body:JSON.stringify({ refreshToken: session.refreshToken })
      }).catch(()=>{});
    }
    clearSession();
    const client = sb();
    if(client){
      try { await client.auth.signOut(); } catch(e){}
    }
    broadcastAuthChange();
  }

  function signOut(){ return logout(); }

  async function saveCharacter(charData, existingId){
    const session = getSession();
    if(!session) return {error:'Not logged in.'};

    const char = {
      id: existingId || 'c_'+Date.now()+'_'+Math.random().toString(36).slice(2),
      userId: session.userId,
      name: (charData.details && charData.details.name) || 'Unnamed Adventurer',
      race: charData.race || null,
      cls: charData.cls || null,
      edition: charData.edition || (charData.system || '5e'),
      data: charData,
      created: existingId ? undefined : Date.now(),
      updated: Date.now()
    };

    const key = CHARS_PREFIX + session.userId;
    const chars = lsGet(key) || [];
    const idx = chars.findIndex(c=>c.id===char.id);
    if(idx >= 0) chars[idx] = Object.assign({}, chars[idx], char);
    else chars.push(char);
    lsSet(key, chars.sort((a,b)=>(b.updated||0)-(a.updated||0)));

    const client = sb();
    if(client){
      try {
        await client.auth.getSession();
        const row = { id:char.id, user_id:session.userId, name:char.name, data:char.data, updated_at:new Date().toISOString() };
        if(!existingId) row.created_at = new Date().toISOString();
        const query = existingId ? client.from('characters').update(row).eq('id', existingId) : client.from('characters').insert(row);
        const { error } = await query;
        if(error) console.warn('Supabase save failed; local save kept.', error.message || error);
      } catch(e){}
    }
    return { id: char.id, success: true };
  }

  async function loadCharacters(){
    const session = getSession();
    if(!session) return [];
    const key = CHARS_PREFIX + session.userId;
    const localChars = (lsGet(key) || []).sort((a,b)=>(b.updated||0)-(a.updated||0));

    const client = sb();
    if(client){
      try {
        const timeout = new Promise(resolve => setTimeout(() => resolve(null), 2500));
        const remote = await Promise.race([
          (async () => {
            const { data, error } = await client.from('characters').select('*').eq('user_id', session.userId).order('updated_at', {ascending:false});
            if(error || !Array.isArray(data)) return null;
            const mapped = data.map(r => ({
              id:r.id, userId:r.user_id, name:r.name, data:r.data,
              race:r.data && r.data.race || null,
              cls:r.data && r.data.cls || null,
              edition:r.data && (r.data.edition || r.data.system) || '5e',
              created:r.created_at ? new Date(r.created_at).getTime() : Date.now(),
              updated:r.updated_at ? new Date(r.updated_at).getTime() : Date.now()
            }));
            lsSet(key, mapped);
            return mapped;
          })(),
          timeout
        ]);
        if(remote) return remote;
      } catch(e){}
    }
    return localChars;
  }

  async function loadCharacter(id){
    const session = getSession();
    if(!session) return null;
    const chars = lsGet(CHARS_PREFIX + session.userId) || [];
    const local = chars.find(c => c.id === id);
    if(local) return local.data || local;

    const client = sb();
    if(client){
      try {
        const { data, error } = await client.from('characters').select('*').eq('id', id).single();
        if(!error && data) return data.data;
      } catch(e){}
    }
    return null;
  }

  async function deleteCharacter(id){
    const session = getSession();
    if(!session) return;
    const key = CHARS_PREFIX + session.userId;
    lsSet(key, (lsGet(key) || []).filter(c => c.id !== id));
    const client = sb();
    if(client){
      try { await client.from('characters').delete().eq('id', id); } catch(e){}
    }
  }

  function getImagePasswordHash(email){
    return lsGetRaw(IMAGE_SECRET_PREFIX + String(email || '').trim().toLowerCase()) || '';
  }

  function setImagePasswordHash(email, hash){
    lsSetRaw(IMAGE_SECRET_PREFIX + String(email || '').trim().toLowerCase(), String(hash || ''));
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
          <div class="pam-field"><label>Password</label><input type="password" id="pam-signup-pw" placeholder="Min. 8 characters" /></div>
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
        <div class="pam-note">Characters are saved locally${typeof PHMURT_CONFIG!=='undefined'&&PHMURT_CONFIG.cloudEnabled?' and synced to the cloud':'.'}.</div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('input').forEach(inp => inp.addEventListener('keydown', e => {
      if(e.key !== 'Enter') return;
      const panel = inp.closest('.pam-form');
      if(panel && panel.id === 'pam-login') PhmurtDB.doLogin();
      else if(panel && panel.id === 'pam-signup') PhmurtDB.doSignup();
      else if(panel && panel.id === 'pam-forgot') PhmurtDB.doForgotPassword();
    }));
  }

  function openAuth(){ buildAuthModal(); const m=document.getElementById('phmurt-auth-modal'); if(m) m.classList.add('open'); }
  function closeAuth(){ const m=document.getElementById('phmurt-auth-modal'); if(m) m.classList.remove('open'); }
  function authTab(tab){
    document.querySelectorAll('.pam-tab').forEach((t,i)=>t.classList.toggle('active',['login','signup','forgot'][i]===tab));
    const loginPanel = document.getElementById('pam-login');
    const signupPanel = document.getElementById('pam-signup');
    const forgotPanel = document.getElementById('pam-forgot');
    if(loginPanel) loginPanel.style.display = tab==='login' ? 'block' : 'none';
    if(signupPanel) signupPanel.style.display = tab==='signup' ? 'block' : 'none';
    if(forgotPanel) forgotPanel.style.display = tab==='forgot' ? 'block' : 'none';
  }

  async function doForgotPassword(){
    const email = (document.getElementById('pam-forgot-email') || {}).value ? document.getElementById('pam-forgot-email').value.trim() : '';
    const errEl = document.getElementById('pam-forgot-err');
    if(!errEl) return;
    if(!email){ errEl.textContent = 'Please enter your email.'; return; }
    errEl.textContent = 'Sending...';

    const client = sb();
    if(client){
      try {
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password.html' });
        if(error){ errEl.textContent = error.message; return; }
      } catch(e){
        errEl.textContent = 'Could not send reset link.';
        return;
      }
    } else {
      errEl.textContent = 'Password reset email requires cloud auth to be configured.';
      return;
    }
    errEl.style.color = '#4CAF50';
    errEl.textContent = '✓ Reset link sent! Check your email.';
    setTimeout(()=>{ errEl.style.color=''; errEl.textContent=''; }, 4000);
  }

  async function doLogin(){
    const email = (document.getElementById('pam-login-email') || {}).value || '';
    const pw = (document.getElementById('pam-login-pw') || {}).value || '';
    const errEl = document.getElementById('pam-login-err');
    if(errEl) errEl.textContent = 'Signing in...';
    const r = await login(email, pw);
    if(r.error){ if(errEl) errEl.textContent = r.error; return; }
    if(errEl) errEl.textContent = '';
    closeAuth();
    updateNavAuth();
    broadcastAuthChange();
    if(typeof window.onAuthChange === 'function') window.onAuthChange(r.user);
  }

  async function doSignup(){
    const name = (document.getElementById('pam-signup-name') || {}).value || '';
    const email = (document.getElementById('pam-signup-email') || {}).value || '';
    const pw = (document.getElementById('pam-signup-pw') || {}).value || '';
    const errEl = document.getElementById('pam-signup-err');
    if(errEl) errEl.textContent = 'Creating account...';
    const r = await signup(name, email, pw);
    if(r.error){ if(errEl) errEl.textContent = r.error; return; }
    if(errEl) errEl.textContent = '';
    closeAuth();
    updateNavAuth();
    broadcastAuthChange();
    if(typeof window.onAuthChange === 'function') window.onAuthChange(r.user);
  }

  function updateNavAuth(){
    const session = getSession();
    const btn = document.getElementById('nav-auth-btn');
    const dropdown = document.getElementById('nav-user-dropdown');
    if(!btn) return;
    if(session && session.userId){
      const label = (session.displayName || session.name || session.email || 'Account').trim();
      btn.textContent = label.length > 16 ? label.split(' ').map(part => part[0]).join('').slice(0,2).toUpperCase() : label.split(' ')[0];
      btn.title = label;
      btn.setAttribute('data-signed-in','1');
      btn.onclick = function(){
        if(dropdown) dropdown.classList.toggle('open');
      };
      if(dropdown){
        const adminLink = session.isAdmin ? '<a href="admin.html">Admin Panel</a>' : '';
        dropdown.innerHTML = '<a href="my-characters.html">My Characters</a>' + adminLink + '<button onclick="PhmurtDB.signOut()">Sign Out</button>';
      }
    } else {
      btn.textContent = 'Sign In';
      btn.removeAttribute('data-signed-in');
      btn.title = '';
      btn.onclick = function(){ PhmurtDB.openAuth(); };
      if(dropdown){ dropdown.innerHTML = ''; dropdown.classList.remove('open'); }
    }
  }

  async function apiFetch(path, options){
    const session = getSession();
    if(!session || !session.accessToken || !apiBase()) throw new Error('No API session.');
    const headers = Object.assign({'Content-Type':'application/json','Authorization':'Bearer '+session.accessToken}, (options && options.headers) || {});
    const res = await fetch(apiBase()+path, Object.assign({}, options || {}, { headers }));
    if(res.status === 204) return null;
    const data = await res.json().catch(()=>null);
    if(!res.ok) throw new Error(data && (data.error||data.message) || 'API request failed.');
    return data;
  }

  function isAdmin(){
    const s = getSession();
    return !!(s && s.isAdmin);
  }

  seedDefaultAdminAccount();
  createChannel();

  document.addEventListener('DOMContentLoaded', async function(){
    updateNavAuth();
    await bootstrapSupabaseSession();
    updateNavAuth();
  });
  window.addEventListener('pageshow', updateNavAuth);
  window.addEventListener('focus', updateNavAuth);
  window.addEventListener('storage', function(e){
    if(!e || !e.key) return;
    if(SESSION_KEYS.includes(e.key) || e.key === 'phmurt_auth_changed_at') _handleExternalAuthChange();
  });
  window.addEventListener('phmurt-auth-change', updateNavAuth);

  return {
    signup, login, logout, signOut, getSession, isAdmin, apiFetch,
    saveCharacter, loadCharacters, loadCharacter, deleteCharacter,
    openAuth, closeAuth, authTab, doLogin, doSignup, doForgotPassword, updateNavAuth,
    getUsersMap, getImagePasswordHash, setImagePasswordHash
  };
})();
