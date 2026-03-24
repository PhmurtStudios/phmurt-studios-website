/* ═══════════════════════════════
   PHMURT AUTH – Local Auth System
   ═══════════════════════════════
   Provides a simple localStorage-based auth system.
   Works offline and across all pages on the same domain.
   When a real backend (Supabase, etc.) is added, this file
   is replaced — the PhmurtDB API surface stays the same.
*/
var PhmurtDB = (function() {
  var AUTH_KEY = 'phmurt_auth_session';
  var _listeners = [];

  function _getStored() {
    try {
      var raw = localStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  }

  function _setStored(data) {
    if (data) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(data));
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
    _fireChange();
  }

  function _fireChange() {
    _listeners.forEach(function(fn) { try { fn(); } catch(e) {} });
    window.dispatchEvent(new Event('phmurt-auth-change'));
  }

  // Generate a simple unique ID
  function _uid() {
    return 'user_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
  }

  return {
    /* ─── Session ─── */
    getSession: function() {
      return _getStored();
    },

    /* ─── Sign Up (local) ─── */
    signUp: function(name, email) {
      var session = {
        userId: _uid(),
        name: name || 'Adventurer',
        email: email || '',
        displayName: name || 'Adventurer',
        createdAt: new Date().toISOString()
      };
      _setStored(session);
      return session;
    },

    /* ─── Sign In (local — just restores or creates) ─── */
    signIn: function(name, email) {
      var existing = _getStored();
      if (existing && existing.email === email) {
        return existing;
      }
      return PhmurtDB.signUp(name, email);
    },

    /* ─── Sign Out ─── */
    signOut: function() {
      _setStored(null);
    },

    /* ─── Auth State Change Listener ─── */
    onAuthStateChange: function(fn) {
      if (typeof fn === 'function') _listeners.push(fn);
    },

    /* ─── Open Auth Modal ─── */
    openAuth: function() {
      // Look for the auth modal or create one
      var modal = document.getElementById('phmurtAuthModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'phmurtAuthModal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:10000;';
        modal.innerHTML = '<div style="background:var(--bg-card,#1e1e2e);border:1px solid var(--crimson-border,#3a1f1f);padding:40px;max-width:400px;width:90%;border-radius:4px;">' +
          '<h3 style="font-family:Cinzel,serif;color:var(--text,#e8dcc0);margin:0 0 8px;font-size:20px;">Sign In to Phmurt Studios</h3>' +
          '<p style="font-size:13px;color:var(--text-dim,#8a7a6a);margin:0 0 24px;">Enter your name to get started. Your data is saved locally in this browser.</p>' +
          '<div style="margin-bottom:16px;">' +
            '<label style="font-family:Cinzel,serif;font-size:9px;letter-spacing:2px;color:var(--text-muted,#6a5a4a);text-transform:uppercase;display:block;margin-bottom:6px;">Your Name</label>' +
            '<input type="text" id="phmurtAuthName" placeholder="Enter your adventurer name" style="width:100%;padding:10px 12px;background:var(--bg-input,#12121e);border:1px solid var(--border,#2a2a3a);color:var(--text,#e8dcc0);font-family:Spectral,serif;font-size:14px;border-radius:2px;box-sizing:border-box;" />' +
          '</div>' +
          '<div style="margin-bottom:24px;">' +
            '<label style="font-family:Cinzel,serif;font-size:9px;letter-spacing:2px;color:var(--text-muted,#6a5a4a);text-transform:uppercase;display:block;margin-bottom:6px;">Email (optional)</label>' +
            '<input type="email" id="phmurtAuthEmail" placeholder="your@email.com" style="width:100%;padding:10px 12px;background:var(--bg-input,#12121e);border:1px solid var(--border,#2a2a3a);color:var(--text,#e8dcc0);font-family:Spectral,serif;font-size:14px;border-radius:2px;box-sizing:border-box;" />' +
          '</div>' +
          '<div style="display:flex;gap:12px;">' +
            '<button id="phmurtAuthSubmit" style="flex:1;padding:12px;background:var(--crimson,#c0392b);color:#f5f0e8;border:none;font-family:Cinzel,serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;cursor:pointer;border-radius:2px;">Sign In</button>' +
            '<button id="phmurtAuthCancel" style="padding:12px 20px;background:transparent;color:var(--text-muted,#6a5a4a);border:1px solid var(--border,#2a2a3a);font-family:Cinzel,serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;cursor:pointer;border-radius:2px;">Cancel</button>' +
          '</div>' +
        '</div>';
        document.body.appendChild(modal);

        // Wire up events
        document.getElementById('phmurtAuthSubmit').addEventListener('click', function() {
          var name = document.getElementById('phmurtAuthName').value.trim();
          var email = document.getElementById('phmurtAuthEmail').value.trim();
          if (!name) {
            document.getElementById('phmurtAuthName').style.borderColor = 'var(--crimson,#c0392b)';
            return;
          }
          PhmurtDB.signIn(name, email);
          modal.remove();
        });

        document.getElementById('phmurtAuthCancel').addEventListener('click', function() {
          modal.remove();
        });

        modal.addEventListener('click', function(e) {
          if (e.target === modal) modal.remove();
        });

        // Focus the name input
        setTimeout(function() {
          document.getElementById('phmurtAuthName').focus();
        }, 100);

        // Enter key submits
        modal.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') {
            document.getElementById('phmurtAuthSubmit').click();
          }
        });
      }
    }
  };
})();

// Cross-tab sync: when another tab signs in/out, update this tab
window.addEventListener('storage', function(e) {
  if (e.key === 'phmurt_auth_session') {
    window.dispatchEvent(new Event('phmurt-auth-change'));
  }
});
