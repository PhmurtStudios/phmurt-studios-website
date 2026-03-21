(function () {
  const SHELL = {
    nav: [
      ['index.html', 'Home'],
      ['grimoire.html', 'Grimoire'],
      ['compendium.html', 'Compendium'],
      ['character-builder.html', 'Builder'],
      ['character-sheets.html', 'Sheets'],
      ['about.html', 'About'],
      ['my-characters.html', 'My Characters']
    ],
    footerName: 'Phmurt Studios',
    footerCopy: 'Roll well. Play weird.'
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
      <nav class="ps-nav">
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
          const sep = index < items.length - 1 ? '<span class="sep">◆</span>' : '';
          return crumb + sep;
        }).join('')}
      </nav>
    `;
  }

  function footerMarkup() {
    return `
      <footer class="ps-footer">
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
    if (typeof window.toggleTheme === 'function') {
      const btn = document.getElementById('themeToggle');
      if (btn) btn.textContent = (saved === 'light' ? '☀' : '☽');
    }
  }

  function ensureShell() {
    const pageName = getPageName();
    const activeLabel = activeNavFor(pageName, document.body?.dataset.navActive || null);

    const navMount = document.getElementById('ps-site-shell');
    if (navMount) navMount.innerHTML = navMarkup(activeLabel);

    const breadcrumbMount = document.getElementById('ps-page-breadcrumb');
    if (breadcrumbMount) {
      const crumbs = parseBreadcrumbData() || BREADCRUMBS[pageName] || [];
      breadcrumbMount.innerHTML = breadcrumbMarkup(crumbs);
    }

    const footerMount = document.getElementById('ps-site-footer');
    if (footerMount) footerMount.innerHTML = footerMarkup();

    syncThemeButton();
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

  document.addEventListener('DOMContentLoaded', function () {
    ensureShell();
    wireAuthButton();
    setupMobileNav();
    setupPageTransitions();
    setupReveal();
    setupAuthDropdownClose();
  });
})();
