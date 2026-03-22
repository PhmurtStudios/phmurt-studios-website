(function () {
  const SHELL = {
    nav: [
      ['index.html', 'Home'],
      ['grimoire.html', 'Grimoire'],
      ['compendium.html', 'Compendium'],
      ['character-builder.html', 'Builder'],
      ['character-sheets.html', 'Sheets'],
      ['campaigns.html', 'Campaigns'],
      ['about.html', 'About'],
      ['my-characters.html', 'My Characters']
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

  function activeNavFor(pageName, explicit) {
    if (explicit) return explicit;
    const map = {
      'index.html': 'Home',
      'grimoire.html': 'Grimoire',
      'compendium.html': 'Compendium',
      'character-builder.html': 'Builder',
      'character-builder-35.html': 'Builder',
      'character-sheets.html': 'Sheets',
      'sheet-dnd5e.html': 'Sheets',
      'campaigns.html': 'Campaigns',
      'about.html': 'About',
      'my-characters.html': 'My Characters',
      'reset-password.html': null,
      'soup-savant.html': 'Grimoire',
      'legendary.html': 'Grimoire'
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
    const links = SHELL.nav.map(([href, label]) =>
      `<a href="${href}"${label === activeLabel ? ' class="active"' : ''}>${label}</a>`
    ).join('');

    const mobileLinks = SHELL.nav.map(([href, label], index) =>
      `${index ? '<div class="ps-mobile-divider"></div>' : ''}<a href="${href}"${label === activeLabel ? ' class="active"' : ''}>${label}</a>`
    ).join('');

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

  function setupKeyboardShortcuts() {
    let lastKeyTime = 0;
    let keySequence = '';
    const keyTimeout = 1000;

    const shortcutsData = [
      { section: 'Navigation', items: [
        { keys: 'g h', desc: 'Go to Home', link: 'index.html' },
        { keys: 'g g', desc: 'Go to Grimoire', link: 'grimoire.html' },
        { keys: 'g c', desc: 'Go to Compendium', link: 'compendium.html' },
        { keys: 'g b', desc: 'Go to Builder', link: 'character-builder.html' },
        { keys: 'g s', desc: 'Go to Sheets', link: 'character-sheets.html' },
        { keys: 'g a', desc: 'Go to About', link: 'about.html' },
        { keys: 'g m', desc: 'Go to Campaigns', link: 'campaigns.html' }
      ]},
      { section: 'Theme', items: [
        { keys: 't', desc: 'Toggle theme', action: 'theme' }
      ]},
      { section: 'Help', items: [
        { keys: '?', desc: 'Show this help', action: 'help' },
        { keys: 'Escape', desc: 'Close overlay', action: 'close' }
      ]}
    ];

    function createOverlay() {
      if (document.getElementById('ps-shortcuts-overlay')) return;
      const overlay = document.createElement('div');
      overlay.id = 'ps-shortcuts-overlay';

      const card = document.createElement('div');
      card.className = 'ps-shortcuts-card';

      const title = document.createElement('div');
      title.className = 'ps-shortcuts-title';
      title.textContent = 'Keyboard Shortcuts';
      card.appendChild(title);

      shortcutsData.forEach(section => {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'ps-shortcuts-section';

        const sectionTitle = document.createElement('div');
        sectionTitle.className = 'ps-shortcuts-section-title';
        sectionTitle.textContent = section.section;
        sectionDiv.appendChild(sectionTitle);

        const list = document.createElement('div');
        list.className = 'ps-shortcuts-list';

        section.items.forEach(item => {
          const itemDiv = document.createElement('div');
          itemDiv.className = 'ps-shortcut-item';

          const desc = document.createElement('div');
          desc.className = 'ps-shortcut-desc';
          desc.textContent = item.desc;

          const keys = document.createElement('div');
          keys.className = 'ps-shortcut-keys';
          keys.textContent = item.keys;

          itemDiv.appendChild(desc);
          itemDiv.appendChild(keys);
          list.appendChild(itemDiv);
        });

        sectionDiv.appendChild(list);
        card.appendChild(sectionDiv);
      });

      const closeBtn = document.createElement('button');
      closeBtn.className = 'ps-shortcuts-close';
      closeBtn.setAttribute('aria-label', 'Close shortcuts');
      closeBtn.textContent = '✕';
      closeBtn.addEventListener('click', () => overlay.classList.remove('visible'));
      card.appendChild(closeBtn);

      overlay.appendChild(card);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('visible');
      });
      document.body.appendChild(overlay);
    }

    function toggleOverlay() {
      createOverlay();
      const overlay = document.getElementById('ps-shortcuts-overlay');
      overlay.classList.toggle('visible');
    }

    document.addEventListener('keydown', (e) => {
      const now = Date.now();
      if (now - lastKeyTime > keyTimeout) {
        keySequence = '';
      }
      lastKeyTime = now;

      if (e.key === '?') {
        e.preventDefault();
        toggleOverlay();
        return;
      }

      if (e.shiftKey && e.key === '?') {
        e.preventDefault();
        toggleOverlay();
        return;
      }

      if (e.key === 't' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (typeof window.toggleTheme === 'function') {
          window.toggleTheme();
        }
        return;
      }

      if (e.key === 'Escape') {
        const overlay = document.getElementById('ps-shortcuts-overlay');
        if (overlay && overlay.classList.contains('visible')) {
          overlay.classList.remove('visible');
        }
        keySequence = '';
        return;
      }

      if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
        keySequence = 'g';
        e.preventDefault();
        return;
      }

      if (keySequence === 'g' && !e.ctrlKey && !e.metaKey && e.key.length === 1) {
        e.preventDefault();
        const navMap = {
          'h': 'index.html',
          'g': 'grimoire.html',
          'c': 'compendium.html',
          'b': 'character-builder.html',
          's': 'character-sheets.html',
          'a': 'about.html',
          'm': 'campaigns.html'
        };
        if (navMap[e.key]) {
          window.location.href = navMap[e.key];
        }
        keySequence = '';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    ensureShell();
    wireAuthButton();
    setupMobileNav();
    setupPageTransitions();
    setupReveal();
    setupAuthDropdownClose();
    setupKeyboardShortcuts();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function() {});
    }
  });
})();
