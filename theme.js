/* ═══════════════════════════════
   THEME TOGGLE – Phmurt Studios
   ═══════════════════════════════ */
(function() {
  var KEY = 'phmurt_theme';
  var saved = localStorage.getItem(KEY) || 'light';
  if (saved === 'light') {
    document.documentElement.classList.add('light-mode');
  }

  window.toggleTheme = function() {
    var isLight = document.documentElement.classList.contains('light-mode');
    if (isLight) {
      document.documentElement.classList.remove('light-mode');
      localStorage.setItem(KEY, 'dark');
    } else {
      document.documentElement.classList.add('light-mode');
      localStorage.setItem(KEY, 'light');
    }
  };
})();
