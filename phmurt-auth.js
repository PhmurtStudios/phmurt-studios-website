// ═══════════════════════════════════════════════════════
// PHMURT STUDIOS — AUTH + CHARACTER STORAGE
// Works with localStorage always.
// Syncs to Supabase cloud when supabase-config.js is set up.
// ═══════════════════════════════════════════════════════

const PhmurtDB = (function(){
  'use strict';

  // ── Simple hash (not cryptographic — for a low-stakes fan site this is fine)
  function hashPw(pw){
    let h=0; for(let i=0;i<pw.length;i++){h=((h<<5)-h)+pw.charCodeAt(i);h|=0;}
    return h.toString(36)+'_'+btoa(pw.length+'x'+pw.split('').reverse().join('').slice(0,4));
  }

  // ── Local storage helpers
  function lsGet(k){ try{return JSON.parse(localStorage.getItem(k));}catch(e){return null;} }
  function lsSet(k,v){ localStorage.setItem(k,JSON.stringify(v)); }

  const USERS_KEY = 'phmurt_users';
  const SESSION_KEY = 'phmurt_session';
  const CHARS_PREFIX = 'phmurt_chars_';

  // ── Supabase client (loaded lazily)
  let _sb = null;
  function sb(){
    if(_sb) return _sb;
    if(typeof PHMURT_CONFIG === 'undefined' || !PHMURT_CONFIG.cloudEnabled) return null;
    if(typeof window.supabase === 'undefined') return null;
    try{ _sb = window.supabase.createClient(PHMURT_CONFIG.supabaseUrl, PHMURT_CONFIG.supabaseAnonKey); }
    catch(e){ console.warn('Supabase init failed', e); }
    return _sb;
  }

  // ══════════════════════════
  // AUTH
  // ══════════════════════════
  async function signup(name, email, password){
    email = email.toLowerCase().trim();
    if(!name||!email||!password) return {error:'All fields required.'};
    if(password.length < 6) return {error:'Password must be at least 6 characters.'};
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return {error:'Invalid email address.'};

    // Check local
    const users = lsGet(USERS_KEY)||[];
    if(users.find(u=>u.email===email)) return {error:'An account with that email already exists.'};

    const user = { id:'u_'+Date.now()+'_'+Math.random().toString(36).slice(2), name, email, pwHash:hashPw(password), created:Date.now() };

    // Try Supabase first
    const client = sb();
    if(client){
      const {data,error} = await client.auth.signUp({email, password, options:{data:{name}}});
      if(error) return {error:error.message};
      user.id = data.user.id;
    }

    users.push(user);
    lsSet(USERS_KEY, users);
    const session = {userId:user.id, name:user.name, email:user.email};
    lsSet(SESSION_KEY, session);
    return {user:session};
  }

  async function login(email, password){
    email = email.toLowerCase().trim();
    if(!email||!password) return {error:'Email and password required.'};

    // Try Supabase
    const client = sb();
    if(client){
      const {data,error} = await client.auth.signInWithPassword({email,password});
      if(error) return {error:'Invalid email or password.'};
      const session = {userId:data.user.id, name:data.user.user_metadata?.name||email.split('@')[0], email:data.user.email};
      lsSet(SESSION_KEY, session);
      return {user:session};
    }

    // Local fallback
    const users = lsGet(USERS_KEY)||[];
    const user = users.find(u=>u.email===email);
    if(!user||user.pwHash!==hashPw(password)) return {error:'Invalid email or password.'};
    const session = {userId:user.id, name:user.name, email:user.email};
    lsSet(SESSION_KEY, session);
    return {user:session};
  }

  function logout(){
    localStorage.removeItem(SESSION_KEY);
    const client = sb();
    if(client) client.auth.signOut();
    window.location.reload();
  }

  function getSession(){ return lsGet(SESSION_KEY); }

  // ══════════════════════════
  // CHARACTERS
  // ══════════════════════════
  async function saveCharacter(charData, existingId){
    const session = getSession();
    if(!session) return {error:'Not logged in.'};

    const char = {
      id: existingId || 'c_'+Date.now()+'_'+Math.random().toString(36).slice(2),
      userId: session.userId,
      name: charData.details?.name || 'Unnamed Adventurer',
      race: charData.race, cls: charData.cls,
      data: charData,
      created: existingId ? undefined : Date.now(),
      updated: Date.now()
    };

    // Supabase
    const client = sb();
    if(client){
      const row = {id:char.id, user_id:session.userId, name:char.name, data:char.data, updated_at:new Date().toISOString()};
      if(!existingId) row.created_at = new Date().toISOString();
      const {error} = existingId
        ? await client.from('characters').update(row).eq('id',existingId)
        : await client.from('characters').insert(row);
      if(error) console.warn('Supabase save failed, using local', error);
    }

    // Always save local
    const key = CHARS_PREFIX + session.userId;
    const chars = lsGet(key)||[];
    const idx = chars.findIndex(c=>c.id===char.id);
    if(idx>=0) chars[idx]={...chars[idx],...char};
    else chars.push(char);
    lsSet(key, chars);
    return {id:char.id, success:true};
  }

  async function loadCharacters(){
    const session = getSession();
    if(!session) return [];

    // Try Supabase
    const client = sb();
    if(client){
      const {data,error} = await client.from('characters').select('*').eq('user_id',session.userId).order('updated_at',{ascending:false});
      if(!error && data){
        // Sync to local
        lsSet(CHARS_PREFIX+session.userId, data.map(r=>({id:r.id,userId:r.user_id,name:r.name,data:r.data,created:new Date(r.created_at).getTime(),updated:new Date(r.updated_at).getTime()})));
        return data.map(r=>({id:r.id,name:r.name,race:r.data?.race,cls:r.data?.cls,updated:r.updated_at,data:r.data}));
      }
    }

    // Local fallback
    return (lsGet(CHARS_PREFIX+session.userId)||[]).sort((a,b)=>(b.updated||0)-(a.updated||0));
  }

  async function deleteCharacter(id){
    const session = getSession();
    if(!session) return;
    const key = CHARS_PREFIX+session.userId;
    lsSet(key,(lsGet(key)||[]).filter(c=>c.id!==id));
    const client = sb();
    if(client) await client.from('characters').delete().eq('id',id);
  }

  async function loadCharacter(id){
    const session = getSession();
    if(!session) return null;
    const client = sb();
    if(client){
      const {data} = await client.from('characters').select('*').eq('id',id).single();
      if(data) return data.data;
    }
    const chars = lsGet(CHARS_PREFIX+(session.userId))||[];
    return chars.find(c=>c.id===id)?.data || null;
  }

  // ══════════════════════════
  // AUTH UI
  // ══════════════════════════
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
        <div class="pam-note">Characters are saved locally${typeof PHMURT_CONFIG!=='undefined'&&PHMURT_CONFIG.cloudEnabled?' and synced to the cloud':'. Enable cloud sync in supabase-config.js'}.</div>
      </div>`;
    document.body.appendChild(modal);

    // Enter key support
    modal.querySelectorAll('input').forEach(inp=>inp.addEventListener('keydown',e=>{if(e.key==='Enter'){ const f=inp.closest('.pam-form'); f.id==='pam-login'?PhmurtDB.doLogin():PhmurtDB.doSignup(); }}));
  }

  function openAuth(){ buildAuthModal(); document.getElementById('phmurt-auth-modal').classList.add('open'); }
  function closeAuth(){ const m=document.getElementById('phmurt-auth-modal'); if(m) m.classList.remove('open'); }
  function authTab(tab){
    document.querySelectorAll('.pam-tab').forEach((t,i)=>t.classList.toggle('active',['login','signup','forgot'][i]===tab));
    document.getElementById('pam-login').style.display=tab==='login'?'block':'none';
    document.getElementById('pam-signup').style.display=tab==='signup'?'block':'none';
    document.getElementById('pam-forgot').style.display=tab==='forgot'?'block':'none';
  }

  async function doForgotPassword(){
    const email=document.getElementById('pam-forgot-email').value.trim();
    const errEl=document.getElementById('pam-forgot-err');
    if(!email){errEl.textContent='Please enter your email.';return;}
    errEl.textContent='Sending...';

    const client=sb();
    if(client){
      const {error}=await client.auth.resetPasswordForEmail(email,{
        redirectTo: window.location.origin+'/reset-password.html'
      });
      if(error){errEl.textContent=error.message;return;}
    }
    // Always show success (don't reveal if email exists)
    errEl.style.color='#4CAF50';
    errEl.textContent='✓ Reset link sent! Check your email.';
    document.getElementById('pam-forgot-email').value='';
    setTimeout(()=>{errEl.style.color='';errEl.textContent='';},5000);
  }

  async function doLogin(){
    const email=document.getElementById('pam-login-email').value;
    const pw=document.getElementById('pam-login-pw').value;
    const errEl=document.getElementById('pam-login-err');
    errEl.textContent='Signing in...';
    const r=await login(email,pw);
    if(r.error){errEl.textContent=r.error;return;}
    errEl.textContent='';
    closeAuth();
    updateNavAuth();
    if(typeof onAuthChange==='function') onAuthChange(r.user);
  }

  async function doSignup(){
    const name=document.getElementById('pam-signup-name').value;
    const email=document.getElementById('pam-signup-email').value;
    const pw=document.getElementById('pam-signup-pw').value;
    const errEl=document.getElementById('pam-signup-err');
    errEl.textContent='Creating account...';
    const r=await signup(name,email,pw);
    if(r.error){errEl.textContent=r.error;return;}
    errEl.textContent='';
    closeAuth();
    updateNavAuth();
    if(typeof onAuthChange==='function') onAuthChange(r.user);
  }

  function updateNavAuth(){
    const session=getSession();
    const btn=document.getElementById('nav-auth-btn');
    const dropdown=document.getElementById('nav-user-dropdown');
    if(!btn) return;
    if(session){
      btn.textContent=session.name.split(' ')[0];
      btn.onclick=()=>dropdown?.classList.toggle('open');
      if(dropdown){ dropdown.innerHTML=`<a href="my-characters.html">My Characters</a><button onclick="PhmurtDB.logout()">Sign Out</button>`; }
    } else {
      btn.textContent='Sign In';
      btn.onclick=()=>PhmurtDB.openAuth();
      if(dropdown) dropdown.innerHTML='';
    }
  }

  // Init on load
  document.addEventListener('DOMContentLoaded', updateNavAuth);

  return { signup, login, logout, getSession, saveCharacter, loadCharacters, loadCharacter, deleteCharacter, openAuth, closeAuth, authTab, doLogin, doSignup, doForgotPassword, updateNavAuth };
})();
