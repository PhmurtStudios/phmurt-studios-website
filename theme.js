// theme.js — apply to <html> so it works before <body> exists
(function(){
  function applyTheme(mode, animate){
    var html = document.documentElement;
    if(animate){
      html.classList.add('theme-transition');
      // Remove transition class after animation completes to avoid
      // slowing down normal interactions
      setTimeout(function(){ html.classList.remove('theme-transition'); }, 500);
    }
    if(mode==='light'){
      html.classList.add('light-mode');
    } else {
      html.classList.remove('light-mode');
    }
    // Update button if it exists yet
    var btn=document.getElementById('themeToggle');
    if(btn) btn.textContent=(mode==='light'?'☀':'☽');
  }

  // Run immediately — html element always exists (no animation on page load)
  var saved=localStorage.getItem('ps-theme')||'light';
  applyTheme(saved, false);

  // Expose global toggle (with animation)
  window.toggleTheme=function(){
    var isLight=document.documentElement.classList.contains('light-mode');
    var next=isLight?'dark':'light';
    localStorage.setItem('ps-theme',next);
    applyTheme(next, true);
  };

  // Re-sync button text once DOM is ready
  document.addEventListener('DOMContentLoaded',function(){
    applyTheme(localStorage.getItem('ps-theme')||'light', false);
  });
})();
