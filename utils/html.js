function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/**
 * Layout générique réutilisable (public + admin)
 * @param {Object} opts
 * @param {string} opts.title
 * @param {string} [opts.nav] - HTML du menu (optionnel)
 * @param {string} opts.body - HTML du contenu
 */
function layout({ title, nav = '', body }) {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/css/style.css" />
  <style>
    .topbar{background:#0b0b0b;color:#fff;padding:18px 0}
    .topbar__inner{max-width:1100px;margin:0 auto;padding:0 18px;display:flex;align-items:center;justify-content:space-between;gap:18px}
    .brand{font-weight:800;letter-spacing:.3px}
    .nav a{color:#fff;opacity:.85;text-decoration:none;margin-left:14px}
    .nav a.active{opacity:1;text-decoration:underline}
    .page{max-width:1100px;margin:22px auto;padding:0 18px}
    .card{background:#fff;border-radius:14px;padding:18px;box-shadow:0 10px 30px rgba(0,0,0,.06)}
  </style>
</head>
<body>
  <header class="topbar">
    <div class="topbar__inner">
      <div class="brand">Restaurant — Admin</div>
      <nav class="nav">
        ${nav}
      </nav>
    </div>
  </header>

  <main class="page">
    <div class="card">
      ${body}
    </div>
  </main>
</body>
</html>`;
}

function adminNav(active = '') {
  const link = (href, label, key) =>
    `<a href="${href}" ${active === key ? 'class="active"' : ''}>${label}</a>`;

  return `
    ${link('/admin/reservations', 'Réservations', 'reservations')}
    ${link('/admin/menu', 'Menu', 'menu')}
    ${link('/admin/settings', 'Paramètres', 'settings')}
    <a href="/">Site</a>
  `;
}

/**
 * Shell admin (pratique) : s'appuie sur layout()
 */
function shell(title, active, content) {
  return layout({
    title,
    nav: adminNav(active),
    body: content,
  });
}

module.exports = { layout, shell, escapeHtml };
