/* ═══════════════════════════════
   THEME TOGGLE – Phmurt Studios
   ═══════════════════════════════ */
(function() {
  var KEY = 'phmurt_theme';
  var saved = localStorage.getItem(KEY) || 'dark';
  document.documentElement.setAttribute('data-theme', saved);

  window.toggleTheme = function() {
    var current = document.documentElement.getAttribute('data-theme') || 'dark';
    var next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(KEY, next);
  };
})();
