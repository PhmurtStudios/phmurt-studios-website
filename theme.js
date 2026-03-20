// theme.js — apply to <html> so it works before <body> exists
(function(){
  function applyTheme(mode){
    if(mode==='light'){
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
    // Update button if it exists yet
    var btn=document.getElementById('themeToggle');
    if(btn) btn.textContent=(mode==='light'?'☀':'☽');
  }

  // Run immediately — html element always exists
  var saved=localStorage.getItem('ps-theme')||'dark';
  applyTheme(saved);

  // Expose global toggle
  window.toggleTheme=function(){
    var isLight=document.documentElement.classList.contains('light-mode');
    var next=isLight?'dark':'light';
    localStorage.setItem('ps-theme',next);
    applyTheme(next);
  };

  // Re-sync button text once DOM is ready
  document.addEventListener('DOMContentLoaded',function(){
    applyTheme(localStorage.getItem('ps-theme')||'dark');
  });
})();
