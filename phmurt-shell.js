(function () {
  const SHELL = {
    nav: [
      { href: 'index.html', label: 'Home' },
      { label: 'Content', children: [
        { href: 'grimoire.html', label: 'Grimoire' },
        { href: 'compendium.html', label: 'Compendium' }
      ]},
      { label: 'Players', children: [
        { href: 'learn.html', label: 'Learn to Play' },
        { href: 'gallery.html', label: 'Character Gallery' },
        { href: 'character-builder.html', label: 'Character Builder' },
        { href: 'character-sheets.html', label: 'Character Sheets' }
      ]},
      { label: 'DM Tools', children: [
        { href: 'generators.html', label: 'Random Generators' },
        { href: 'campaigns.html', label: 'Campaign Manager' }
      ]},
      { href: 'about.html', label: 'About' },
      { href: 'my-characters.html', label: 'My Characters' },
      { href: 'admin.html', label: 'Admin' }
    ],
    // flat list for mobile menu and backwards compat
    flatNav: [
      ['index.html', 'Home'],
      ['grimoire.html', 'Grimoire'],
      ['compendium.html', 'Compendium'],
      ['learn.html', 'Learn'],
      ['gallery.html', 'Gallery'],
      ['generators.html', 'Generators'],
      ['character-builder.html', 'Builder'],
      ['character-sheets.html', 'Sheets'],
      ['campaigns.html', 'Campaigns'],
      ['about.html', 'About'],
      ['my-characters.html', 'My Characters'],
      ['admin.html', 'Admin']
    ],
    footerName: 'Phmurt Studios',
    footerCopy: 'Roll Well. Play Weird.'
  };

  const BREADCRUMBS = {
    'index.html': [
      { label: 'Home', current: true }
    ],
    'about.html': [
      { href: 'index.html', label: 'Home' },
      { label: 'About', current: true }
    ],
    'grimoire.html': [
      { href: 'index.html', label: 'Home' },
      { label: 'Grimoire', current: true }
    ],
    'compendium.html': [
      { href: 'index.html', label: 'Home' },
      { label: 'Compendium', current: true }
    ],
    'character-builder.html': [
      { href: 'index.html', label: 'Home' },
      { label: 'Character Builder', current: true }
    ],
    'character-builder-35.html': [
      { href: 'index.html', label: 'Home' },
      { href: 'character-sheets.html', label: 'Sheets' },
      { label: 'D&D 3.5e Builder', current: true }
    ],
    'character-sheets.html': [
      { href: 'index.html', label: 'Home' },
      { label: 'Character Sheets', current: true }
    ],
    'sheet-dnd5e.html': [
      { href: 'index.html', label: 'Home' },
      { href: 'character-sheets.html', label: 'Sheets' },
      { label: 'D&D 5e Sheet', current: true }
    ],
    'soup-savant.html': [
      { href: 'index.html', label: 'Home' },
      { href: 'grimoire.html', label: 'Grimoire' },
      { label: 'Soup Savant', current: true }
    ],
    'legendary.html': [
      { href: 'index.html', label: 'Home' },
      { href: 'grimoire.html', label: 'Grimoire' },
      { label: 'Legendary Soups', current: true }
    ],
    'learn.html': [
      { href: 'index.html', label: 'Home' },
      { label: 'Learn to Play', current: true }
    ],
    'gallery.html': [
      { href: 'index.html', label: 'Home' },
      { label: 'Character Gallery', current: true }
    ],
    'generators.html': [
      { href: 'index.html', label: 'Home' },
      { label: 'DM Generators', current: true }
    ],
    'campaigns.html': [
      { href: 'index.html', label: 'Home' },
      { label: 'Campaigns', current: true }
    ],
    'my-characters.html': [
      { href: 'index.html', label: 'Home' },
      { label: 'My Characters', current: true }
    ],
    'reset-password.html': [
      { href: 'index.html', label: 'Home' },
      { label: 'Reset Password', current: true }
    ],
    '404.html': [
      { href: 'index.html', label: 'Home' },
      { label: 'Page Not Found', current: true }
    ]
  };

  function normalizePath(path) {
    if (!path || path === '/' || path.endsWith('/')) return 'index.html';
    return path.split('/').pop();
  }

  // Map page filenames to which top-level nav label should be active
  // For dropdown parents, use the dropdown label so the parent highlights
  function activeNavFor(pageName, explicit) {
    if (explicit) return explicit;
    const map = {
      'index.html': 'Home',
      'grimoire.html': 'Content',
      'compendium.html': 'Content',
      'soup-savant.html': 'Content',
      'legendary.html': 'Content',
      'learn.html': 'Players',
      'gallery.html': 'Players',
      'character-builder.html': 'Players',
      'character-builder-35.html': 'Players',
      'character-sheets.html': 'Players',
      'sheet-dnd5e.html': 'Players',
      'generators.html': 'DM Tools',
      'campaigns.html': 'DM Tools',
      'about.html': 'About',
      'my-characters.html': 'My Characters',
      'reset-password.html': null
    };
    return map[pageName] ?? null;
  }

  function getFooterCopy() {
    return document.body?.dataset.footerCopy || SHELL.footerCopy;
  }

  function getPageName() {
    return normalizePath(window.location.pathname);
  }

  function parseBreadcrumbData() {
    const raw = document.body?.dataset.breadcrumb;
    if (!raw) return null;
    const items = raw.split(';').map(part => part.trim()).filter(Boolean).map((part, index, arr) => {
      const [labelPart, hrefPart] = part.split('|').map(v => (v || '').trim());
      return {
        label: labelPart,
        href: hrefPart || undefined,
        current: !hrefPart || index === arr.length - 1
      };
    }).filter(item => item.label);
    return items.length ? items : null;
  }

  function navMarkup(activeLabel) {
    // Desktop nav with dropdown support
    const links = SHELL.nav.map(item => {
      if (item.children) {
        const isActive = item.label === activeLabel;
        const childLinks = item.children.map(c =>
          `<a href="${c.href}" class="ps-dropdown-link">${c.label}</a>`
        ).join('');
        return `<div class="ps-nav-dropdown${isActive ? ' active' : ''}">
          <button class="ps-nav-dropdown-btn${isActive ? ' active' : ''}" type="button">${item.label} <span class="ps-nav-caret">▾</span></button>
          <div class="ps-dropdown-panel">${childLinks}</div>
        </div>`;
      }
      return `<a href="${item.href}"${item.label === activeLabel ? ' class="active"' : ''}>${item.label}</a>`;
    }).join('');

    // Mobile nav uses flat list with group headers
    let mobileLinks = '';
    SHELL.nav.forEach((item, index) => {
      if (item.children) {
        mobileLinks += `<div class="ps-mobile-group-label">${item.label}</div>`;
        item.children.forEach(c => {
          mobileLinks += `<a href="${c.href}">${c.label}</a>`;
        });
        mobileLinks += '<div class="ps-mobile-divider"></div>';
      } else {
        if (index > 0) mobileLinks += '<div class="ps-mobile-divider"></div>';
        mobileLinks += `<a href="${item.href}"${item.label === activeLabel ? ' class="active"' : ''}>${item.label}</a>`;
      }
    });

    return `
      <nav class="ps-nav" role="navigation" aria-label="Main navigation">
        <div class="ps-nav-links">${links}</div>
        <div class="ps-nav-right">
          <button class="ps-theme-toggle" id="themeToggle" type="button" aria-label="Toggle theme" onclick="toggleTheme()">☽</button>
          <div class="nav-auth-wrap">
            <button id="nav-auth-btn" type="button">Sign In</button>
            <div id="nav-user-dropdown"></div>
          </div>
          <button class="ps-hamburger" id="hamburger" type="button" aria-label="Menu" aria-controls="mobileMenu" aria-expanded="false"><span></span><span></span><span></span></button>
        </div>
      </nav>

      <div class="ps-mobile-menu" id="mobileMenu" aria-hidden="true">
        <button class="ps-mobile-close" id="mobileClose" type="button">✕ Close</button>
        ${mobileLinks}
      </div>
    `;
  }

  function breadcrumbMarkup(items) {
    if (!items || !items.length) return '';
    return `
      <nav class="ps-breadcrumb" aria-label="Breadcrumb">
        ${items.map((item, index) => {
          const crumb = item.current || !item.href
            ? `<span class="current">${item.label}</span>`
            : `<a href="${item.href}">${item.label}</a>`;
          const sep = index < items.length - 1 ? '<span class="sep">/</span>' : '';
          return crumb + sep;
        }).join('')}
      </nav>
    `;
  }

  function footerMarkup() {
    return `
      <footer class="ps-footer" role="contentinfo">
        <div class="ps-footer-logo">
          <img src="logo.png" alt="Phmurt Studios" />
          <span class="ps-footer-name">${SHELL.footerName}</span>
        </div>
        <div class="ps-footer-copy">${getFooterCopy()}</div>
      </footer>
    `;
  }

  function syncThemeButton() {
    const saved = localStorage.getItem('ps-theme') || 'light';
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = (saved === 'light' ? '☀' : '☽');
  }

  // Wrap toggleTheme to add smooth transition class
  (function enhanceThemeToggle() {
    const origCheck = setInterval(() => {
      if (typeof window.toggleTheme !== 'function') return;
      clearInterval(origCheck);
      const origToggle = window.toggleTheme;
      window.toggleTheme = function() {
        document.documentElement.classList.add('theme-transition');
        origToggle.apply(this, arguments);
        syncThemeButton();
        setTimeout(() => document.documentElement.classList.remove('theme-transition'), 500);
      };
    }, 50);
    // Safety: stop checking after 5s
    setTimeout(() => clearInterval(origCheck), 5000);
  })();

  function ensureShell() {
    const pageName = getPageName();
    const activeLabel = activeNavFor(pageName, document.body?.dataset.navActive || null);

    // Skip-nav link (accessibility)
    if (!document.querySelector('.ps-skip-nav')) {
      const skip = document.createElement('a');
      skip.href = '#main-content';
      skip.className = 'ps-skip-nav';
      skip.textContent = 'Skip to content';
      document.body.insertBefore(skip, document.body.firstChild);
    }

    const navMount = document.getElementById('ps-site-shell');
    if (navMount) navMount.innerHTML = navMarkup(activeLabel);

    // Add main-content id to first content area
    const mainTarget = document.querySelector('.ps-page-hero, .ps-hero, .cb-wrap, .cs-wrap, .ps-content, main');
    if (mainTarget && !mainTarget.id) mainTarget.id = 'main-content';

    const breadcrumbMount = document.getElementById('ps-page-breadcrumb');
    if (breadcrumbMount) {
      const crumbs = parseBreadcrumbData() || BREADCRUMBS[pageName] || [];
      breadcrumbMount.innerHTML = breadcrumbMarkup(crumbs);
    }

    const footerMount = document.getElementById('ps-site-footer');
    if (footerMount) footerMount.innerHTML = footerMarkup();

    syncThemeButton();
    setupBackToTop();
  }

  function setupBackToTop() {
    if (document.querySelector('.ps-top-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'ps-top-btn';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = '&#8593;';
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    document.body.appendChild(btn);

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          btn.classList.toggle('visible', window.scrollY > 400);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  function wireAuthButton() {
    const btn = document.getElementById('nav-auth-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (window.PhmurtDB && typeof window.PhmurtDB.openAuth === 'function') {
        window.PhmurtDB.openAuth();
        return;
      }
      window.location.href = 'my-characters.html';
    });
  }

  function setupMobileNav() {
    const ham = document.getElementById('hamburger');
    const menu = document.getElementById('mobileMenu');
    const close = document.getElementById('mobileClose');
    if (!ham || !menu) return;

    const setOpen = (open) => {
      ham.classList.toggle('open', open);
      menu.classList.toggle('open', open);
      ham.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-hidden', String(!open));
      document.body.classList.toggle('menu-open', open);
    };

    ham.addEventListener('click', () => setOpen(!menu.classList.contains('open')));
    if (close) close.addEventListener('click', () => setOpen(false));
    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('click', (e) => {
      if (!menu.classList.contains('open')) return;
      if (e.target.closest('#mobileMenu') || e.target.closest('#hamburger')) return;
      setOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('open')) setOpen(false);
    });
  }

  function setupNavDropdowns() {
    var closeTimer = null;

    document.querySelectorAll('.ps-nav-dropdown').forEach(function(dd) {
      // Mouse enter — open immediately, cancel any pending close
      dd.addEventListener('mouseenter', function() {
        if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
        // Close all others first
        document.querySelectorAll('.ps-nav-dropdown.open').forEach(function(other) {
          if (other !== dd) other.classList.remove('open');
        });
        dd.classList.add('open');
      });

      // Mouse leave — close after short delay so user can move to panel
      dd.addEventListener('mouseleave', function() {
        var ref = dd;
        closeTimer = setTimeout(function() {
          ref.classList.remove('open');
          closeTimer = null;
        }, 200);
      });

      // Click toggle for touch devices
      var btn = dd.querySelector('.ps-nav-dropdown-btn');
      if (btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var wasOpen = dd.classList.contains('open');
          document.querySelectorAll('.ps-nav-dropdown.open').forEach(function(d) { d.classList.remove('open'); });
          if (!wasOpen) dd.classList.add('open');
        });
      }
    });

    // Click outside closes all
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.ps-nav-dropdown')) {
        document.querySelectorAll('.ps-nav-dropdown.open').forEach(function(d) { d.classList.remove('open'); });
      }
    });

    // Escape closes all
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        document.querySelectorAll('.ps-nav-dropdown.open').forEach(function(d) { d.classList.remove('open'); });
      }
    });
  }

  function setupPageTransitions() {
    document.querySelectorAll('a[href]').forEach((a) => {
      if (a.dataset.noTransition === 'true') return;
      const href = a.getAttribute('href');
      if (!href) return;
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      if (/^(https?:)?\/\//i.test(href)) return;
      if (!href.endsWith('.html')) return;

      a.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        document.body.classList.add('page-out');
        window.setTimeout(() => { window.location.href = href; }, 180);
      });
    });
  }

  function setupReveal() {
    const revealEls = document.querySelectorAll('.reveal');
    if (!revealEls.length || !('IntersectionObserver' in window)) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, { threshold: 0.12 });
    revealEls.forEach((el) => obs.observe(el));
  }

  function setupAuthDropdownClose() {
    document.addEventListener('click', function (e) {
      if (e.target.closest('.nav-auth-wrap')) return;
      const dd = document.getElementById('nav-user-dropdown');
      if (dd) dd.classList.remove('open');
    });
  }

  window.psToast = function(message, duration) {
    duration = duration || 3000;
    const existing = document.getElementById('ps-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'ps-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(function() { toast.classList.add('visible'); });
    setTimeout(function() {
      toast.classList.remove('visible');
      setTimeout(function() { toast.remove(); }, 300);
    }, duration);
  };

  document.addEventListener('DOMContentLoaded', function () {
    ensureShell();
    wireAuthButton();
    setupMobileNav();
    setupNavDropdowns();
    setupPageTransitions();
    setupReveal();
    setupAuthDropdownClose();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function() {});
    }
  });
})();
