/* =========================
   Sécurité : échappement HTML
========================= */
function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/* =========================
   Layout HTML global
========================= */
function layout({ title = 'Admin', nav = '', body = '' }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>

  <!-- CSS global -->
  <link rel="stylesheet" href="/css/style.css">

  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f6f7fb;
      margin: 0;
      color: #1f2937;
    }

    a { text-decoration: none; color: inherit; }

    .topbar {
      background: #111827;
      color: #fff;
    }

    .topbar__inner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 1200px;
      margin: 0 auto;
      padding: 14px 20px;
    }

    .brand a {
      font-weight: 800;
      font-size: 18px;
      color: #fff;
    }

    .nav {
      display: flex;
      gap: 16px;
    }

    .nav a {
      color: #e5e7eb;
      font-weight: 500;
    }

    .nav a.active {
      font-weight: 700;
      text-decoration: underline;
    }

    .container {
      max-width: 1200px;
      margin: 24px auto;
      padding: 0 20px;
    }

    .page {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .page__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .page__header h1 {
      margin: 0;
      font-size: 26px;
    }

    .muted {
      color: #6b7280;
      font-size: 14px;
    }

    .card {
      background: #fff;
      border-radius: 14px;
      padding: 20px;
      box-shadow: 0 10px 20px rgba(0,0,0,.05);
    }

    .btn {
      background: #2563eb;
      color: #fff;
      padding: 8px 14px;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      font-weight: 600;
    }

    .btn--secondary {
      background: #e5e7eb;
      color: #111827;
    }

    .btn--danger {
      background: #dc2626;
    }

    .btn--small {
      padding: 6px 10px;
      font-size: 13px;
    }

    .actions-row {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
    }

    table.table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
    }

    table th,
    table td {
      text-align: left;
      padding: 10px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }

    table th {
      font-size: 13px;
      text-transform: uppercase;
      color: #6b7280;
    }

    .tag {
      display: inline-block;
      background: #e0f2fe;
      color: #0369a1;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      margin-right: 4px;
    }

    .tag--off {
      background: #fee2e2;
      color: #991b1b;
    }

    form.form label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-weight: 600;
      font-size: 14px;
    }

    form.form input,
    form.form textarea,
    form.form select {
      padding: 8px;
      border-radius: 8px;
      border: 1px solid #d1d5db;
      font-size: 14px;
    }

    .two-cols {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    @media (max-width: 720px) {
      .two-cols {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>

<body>

  <header class="topbar">
    <div class="topbar__inner">
      <div class="brand">
        <a href="/">Restaurant Admin</a>
      </div>
      <nav class="nav">
        ${nav}
      </nav>
    </div>
  </header>

  <main class="container">
    ${body}
  </main>

</body>
</html>`;
}

module.exports = { layout, escapeHtml };
