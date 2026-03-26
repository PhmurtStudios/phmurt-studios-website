/* ═══════════════════════════════════════════════════════════════════
   PHMURT AUTH  –  Local Auth System  v2
   ═══════════════════════════════════════════════════════════════════
   Full sign-up / sign-in with required email + hashed password.
   Passwords are SHA-256 hashed (email-salted) via Web Crypto API.
   When a real backend (Supabase / .NET) is wired in, this file is
   replaced — the public PhmurtDB API surface stays the same.
   ═══════════════════════════════════════════════════════════════════ */
var PhmurtDB = (function () {

  /* ── Storage keys ──────────────────────────────────────────────── */
  var SESSION_KEY = 'phmurt_auth_session';   // primary active session object
  var SESSION_ALIAS_KEYS = ['phmurt_session', 'phmurt_admin_session'];
  var USERS_KEY   = 'phmurt_users_db';       // { email → userRecord }

  /* ── Admin list ────────────────────────────────────────────────── */
  // Add email addresses here to grant admin access.
  var ADMIN_EMAILS = [
    'dreverad18@gmail.com'
  ];

  var BOOTSTRAP_ADMIN = {
    userId: 'user_admin_dreverad18',
    name: 'Aaron Drever',
    email: 'dreverad18@gmail.com',
    passwordHash: '0526e1d92389b37ccf3d6eac71daaff8db4db23737e5f17045fbd3ba3e7481f8',
    createdAt: '2026-03-26T00:00:00.000Z'
  };

  /* ── Internal helpers ──────────────────────────────────────────── */
  var _listeners = [];

function _readSessionFrom(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); }
  catch (e) { return null; }
}

function _normalizeSession(data) {
  if (!data) return null;
  var email = String(data.email || '').trim().toLowerCase();
  return {
    userId: data.userId || data.id || '',
    name: data.name || data.displayName || email || 'Account',
    email: email,
    displayName: data.displayName || data.name || email || 'Account',
    isAdmin: data.isAdmin === true || ADMIN_EMAILS.indexOf(email) !== -1
  };
}

function _getSession() {
  var session = _normalizeSession(_readSessionFrom(SESSION_KEY));
  if (session) return session;
  for (var i = 0; i < SESSION_ALIAS_KEYS.length; i++) {
    session = _normalizeSession(_readSessionFrom(SESSION_ALIAS_KEYS[i]));
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return session;
    }
  }
  return null;
}

function _setSession(data) {
  var session = _normalizeSession(data);
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    SESSION_ALIAS_KEYS.forEach(function(key) {
      localStorage.setItem(key, JSON.stringify(session));
    });
  } else {
    localStorage.removeItem(SESSION_KEY);
    SESSION_ALIAS_KEYS.forEach(function(key) {
      localStorage.removeItem(key);
    });
  }
  _fireChange();
}

function _getUsers() {

    try { return JSON.parse(localStorage.getItem(USERS_KEY) || '{}'); }
    catch (e) { return {}; }
  }

  function _saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function _ensureBootstrapAdmin() {
    var users = _getUsers();
    var current = users[BOOTSTRAP_ADMIN.email] || {};
    users[BOOTSTRAP_ADMIN.email] = {
      userId: current.userId || BOOTSTRAP_ADMIN.userId,
      name: current.name || BOOTSTRAP_ADMIN.name,
      email: BOOTSTRAP_ADMIN.email,
      passwordHash: BOOTSTRAP_ADMIN.passwordHash,
      createdAt: current.createdAt || BOOTSTRAP_ADMIN.createdAt
    };
    _saveUsers(users);

    var session = _getSession();
    if (session && (session.email || '').trim().toLowerCase() === BOOTSTRAP_ADMIN.email && session.isAdmin !== true) {
      session.isAdmin = true;
      _setSession(session);
      return;
    }
  }

  function _fireChange() {
    _listeners.forEach(function (fn) { try { fn(); } catch (e) {} });
    window.dispatchEvent(new Event('phmurt-auth-change'));
  }

  function _uid() {
    return 'user_' + Date.now().toString(36) + '_' +
           Math.random().toString(36).substr(2, 6);
  }

  /* SHA-256(password + ':' + email) → hex string */
  function _hashPassword(password, email) {
    var str = password + ':' + email.toLowerCase();
    var buf = new TextEncoder().encode(str);
    return crypto.subtle.digest('SHA-256', buf).then(function (hash) {
      return Array.from(new Uint8Array(hash))
        .map(function (b) { return b.toString(16).padStart(2, '0'); })
        .join('');
    });
  }

  /* Build a clean session object (never includes passwordHash) */
  function _makeSession(user) {
    return {
      userId:      user.userId,
      name:        user.name,
      email:       user.email,
      displayName: user.name,
      isAdmin:     ADMIN_EMAILS.indexOf(user.email) !== -1
    };
  }

  _ensureBootstrapAdmin();

  /* ── Public API ────────────────────────────────────────────────── */
  return {

    getSession: function () { return _getSession(); },

    isAdmin: function () {
      var s = _getSession();
      return !!(s && s.isAdmin === true);
    },

    /* signUp(name, email, password) → Promise<session> */
    signUp: function (name, email, password) {
      var normalEmail = (email || '').trim().toLowerCase();
      if (!normalEmail) return Promise.reject(new Error('Email is required.'));
      if (!password)    return Promise.reject(new Error('Password is required.'));

      var users = _getUsers();
      if (users[normalEmail]) {
        return Promise.reject(new Error('An account with that email already exists.'));
      }

      return _hashPassword(password, normalEmail).then(function (hash) {
        var user = {
          userId:       _uid(),
          name:         (name || 'Adventurer').trim(),
          email:        normalEmail,
          passwordHash: hash,
          createdAt:    new Date().toISOString()
        };
        users[normalEmail] = user;
        _saveUsers(users);
        var session = _makeSession(user);
        _setSession(session);
        return session;
      });
    },

    /* signIn(email, password) → Promise<session> */
    signIn: function (email, password) {
      var normalEmail = (email || '').trim().toLowerCase();
      if (!normalEmail) return Promise.reject(new Error('Email is required.'));
      if (!password)    return Promise.reject(new Error('Password is required.'));

      var users = _getUsers();
      var user  = users[normalEmail];
      if (!user) {
        return Promise.reject(new Error('No account found with that email.'));
      }

      return _hashPassword(password, normalEmail).then(function (hash) {
        if (hash !== user.passwordHash) {
          throw new Error('Incorrect password.');
        }
        var session = _makeSession(user);
        _setSession(session);
        return session;
      });
    },

    signOut: function () { _setSession(null); },
    syncSession: function () { _ensureBootstrapAdmin(); var s = _getSession(); if (s) _setSession(s); return s; },

    onAuthStateChange: function (fn) {
      if (typeof fn === 'function') _listeners.push(fn);
    },

    /* ── Auth Modal ──────────────────────────────────────────────── */
    openAuth: function () {
      if (document.getElementById('phmurtAuthModal')) return;

      /* ── Styles ── */
      var S = {
        overlay:  'position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;z-index:10000;padding:16px;',
        card:     'background:var(--bg-card,#111010);border:1px solid var(--crimson-border,rgba(192,57,43,0.32));padding:40px 36px;max-width:420px;width:100%;border-radius:4px;position:relative;',
        title:    'font-family:Cinzel,serif;font-size:20px;font-weight:400;color:var(--text,#f5ede0);margin:0 0 6px;letter-spacing:.5px;',
        sub:      'font-family:Spectral,serif;font-size:13px;color:var(--text-muted,#8c7d6e);margin:0 0 24px;',
        tabs:     'display:flex;border-bottom:1px solid var(--border,rgba(255,255,255,0.09));margin-bottom:24px;',
        tab:      'font-family:Cinzel,serif;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;padding:8px 16px;cursor:pointer;border:none;background:transparent;border-bottom:2px solid transparent;margin-bottom:-1px;transition:color .15s,border-color .15s;',
        tabOn:    'color:var(--crimson,#c0392b);border-bottom-color:var(--crimson,#c0392b);',
        tabOff:   'color:var(--text-muted,#8c7d6e);border-bottom-color:transparent;',
        label:    'font-family:Cinzel,serif;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted,#8c7d6e);display:block;margin-bottom:6px;',
        input:    'width:100%;padding:10px 12px;background:var(--bg-input,rgba(255,255,255,0.04));border:1px solid var(--border,rgba(255,255,255,0.09));color:var(--text,#f5ede0);font-family:Spectral,serif;font-size:14px;border-radius:3px;box-sizing:border-box;outline:none;transition:border-color .15s;',
        field:    'margin-bottom:16px;',
        btn:      'width:100%;padding:12px;background:var(--crimson,#c0392b);color:#f5f0e8;border:none;font-family:Cinzel,serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;cursor:pointer;border-radius:3px;margin-top:8px;transition:background .15s;',
        err:      'font-family:Spectral,serif;font-size:13px;color:var(--crimson,#c0392b);background:rgba(192,57,43,0.1);border-radius:3px;padding:10px 12px;margin-bottom:16px;display:none;',
        close:    'position:absolute;top:14px;right:16px;background:transparent;border:none;color:var(--text-muted,#8c7d6e);font-size:20px;cursor:pointer;line-height:1;padding:4px 8px;'
      };

      /* ── Build modal HTML ── */
      var modal = document.createElement('div');
      modal.id = 'phmurtAuthModal';
      modal.style.cssText = S.overlay;

      modal.innerHTML =
        '<div style="' + S.card + '">' +
          '<button id="pa-close" style="' + S.close + '" aria-label="Close">✕</button>' +
          '<h3 style="' + S.title + '">Phmurt Studios</h3>' +
          '<p style="' + S.sub + '">Sign in to access your account and saved characters.</p>' +

          /* ── Tabs ── */
          '<div style="' + S.tabs + '">' +
            '<button id="pa-tab-in"  style="' + S.tab + S.tabOn  + '" data-tab="in">Sign In</button>' +
            '<button id="pa-tab-up"  style="' + S.tab + S.tabOff + '" data-tab="up">Create Account</button>' +
          '</div>' +

          /* ── Error banner ── */
          '<div id="pa-err" style="' + S.err + '"></div>' +

          /* ── Sign-In fields ── */
          '<div id="pa-panel-in">' +
            '<div style="' + S.field + '"><label style="' + S.label + '">Email Address</label>' +
              '<input id="pa-in-email" type="email" autocomplete="email" placeholder="you@example.com" style="' + S.input + '" /></div>' +
            '<div style="' + S.field + '"><label style="' + S.label + '">Password</label>' +
              '<input id="pa-in-pass" type="password" autocomplete="current-password" placeholder="••••••••" style="' + S.input + '" /></div>' +
            '<button id="pa-in-submit" style="' + S.btn + '">Sign In</button>' +
          '</div>' +

          /* ── Create Account fields ── */
          '<div id="pa-panel-up" style="display:none;">' +
            '<div style="' + S.field + '"><label style="' + S.label + '">Display Name</label>' +
              '<input id="pa-up-name" type="text" autocomplete="name" placeholder="Your adventurer name" style="' + S.input + '" /></div>' +
            '<div style="' + S.field + '"><label style="' + S.label + '">Email Address</label>' +
              '<input id="pa-up-email" type="email" autocomplete="email" placeholder="you@example.com" style="' + S.input + '" /></div>' +
            '<div style="' + S.field + '"><label style="' + S.label + '">Password</label>' +
              '<input id="pa-up-pass" type="password" autocomplete="new-password" placeholder="Choose a password" style="' + S.input + '" /></div>' +
            '<div style="' + S.field + '"><label style="' + S.label + '">Confirm Password</label>' +
              '<input id="pa-up-pass2" type="password" autocomplete="new-password" placeholder="Repeat your password" style="' + S.input + '" /></div>' +
            '<button id="pa-up-submit" style="' + S.btn + '">Create Account</button>' +
          '</div>' +

        '</div>';

      document.body.appendChild(modal);

      /* ── Helper: show error ── */
      function showErr(msg) {
        var el = document.getElementById('pa-err');
        el.textContent = msg;
        el.style.display = msg ? 'block' : 'none';
      }

      function setLoading(btnId, loading) {
        var btn = document.getElementById(btnId);
        if (!btn) return;
        btn.disabled = loading;
        btn.style.opacity = loading ? '0.6' : '1';
        btn.style.cursor  = loading ? 'wait' : 'pointer';
      }

      /* ── Tabs ── */
      function switchTab(tab) {
        showErr('');
        var inPanel  = document.getElementById('pa-panel-in');
        var upPanel  = document.getElementById('pa-panel-up');
        var inTab    = document.getElementById('pa-tab-in');
        var upTab    = document.getElementById('pa-tab-up');
        if (tab === 'in') {
          inPanel.style.display  = 'block';
          upPanel.style.display  = 'none';
          inTab.style.cssText    = S.tab + S.tabOn;
          upTab.style.cssText    = S.tab + S.tabOff;
          document.getElementById('pa-in-email').focus();
        } else {
          inPanel.style.display  = 'none';
          upPanel.style.display  = 'block';
          inTab.style.cssText    = S.tab + S.tabOff;
          upTab.style.cssText    = S.tab + S.tabOn;
          document.getElementById('pa-up-name').focus();
        }
      }

      document.getElementById('pa-tab-in').addEventListener('click', function () { switchTab('in'); });
      document.getElementById('pa-tab-up').addEventListener('click', function () { switchTab('up'); });

      /* ── Close ── */
      function closeModal() { modal.remove(); }
      document.getElementById('pa-close').addEventListener('click', closeModal);
      modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
      modal.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

      /* ── Sign In submit ── */
      document.getElementById('pa-in-submit').addEventListener('click', function () {
        showErr('');
        var email = document.getElementById('pa-in-email').value.trim();
        var pass  = document.getElementById('pa-in-pass').value;
        if (!email) { showErr('Please enter your email address.'); return; }
        if (!pass)  { showErr('Please enter your password.'); return; }
        setLoading('pa-in-submit', true);
        PhmurtDB.signIn(email, pass)
          .then(function () { closeModal(); })
          .catch(function (err) {
            showErr(err.message || 'Sign in failed. Please try again.');
            setLoading('pa-in-submit', false);
          });
      });

      /* ── Create Account submit ── */
      document.getElementById('pa-up-submit').addEventListener('click', function () {
        showErr('');
        var name  = document.getElementById('pa-up-name').value.trim();
        var email = document.getElementById('pa-up-email').value.trim();
        var pass  = document.getElementById('pa-up-pass').value;
        var pass2 = document.getElementById('pa-up-pass2').value;
        if (!name)            { showErr('Please enter a display name.'); return; }
        if (!email)           { showErr('Please enter your email address.'); return; }
        if (!pass)            { showErr('Please choose a password.'); return; }
        if (pass.length < 8)  { showErr('Password must be at least 8 characters.'); return; }
        if (pass !== pass2)   { showErr('Passwords do not match.'); return; }
        setLoading('pa-up-submit', true);
        PhmurtDB.signUp(name, email, pass)
          .then(function () { closeModal(); })
          .catch(function (err) {
            showErr(err.message || 'Account creation failed. Please try again.');
            setLoading('pa-up-submit', false);
          });
      });

      /* ── Enter key support ── */
      modal.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        var inPanel = document.getElementById('pa-panel-in');
        if (inPanel && inPanel.style.display !== 'none') {
          document.getElementById('pa-in-submit').click();
        } else {
          document.getElementById('pa-up-submit').click();
        }
      });

      /* ── Focus first field ── */
      setTimeout(function () {
        var el = document.getElementById('pa-in-email');
        if (el) el.focus();
      }, 80);
    }
  };

})();

/* ── Cross-tab sync ──────────────────────────────────────────────── */
window.addEventListener('storage', function (e) {
  if (e.key === 'phmurt_auth_session' || e.key === 'phmurt_session' || e.key === 'phmurt_admin_session' || e.key === 'phmurt_users_db') {
    try { if (window.PhmurtDB && typeof window.PhmurtDB.syncSession === 'function') window.PhmurtDB.syncSession(); } catch (err) {}
    window.dispatchEvent(new Event('phmurt-auth-change'));
  }
});
