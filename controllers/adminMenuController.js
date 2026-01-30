const { layout, escapeHtml } = require('../utils/html');
const Dish = require('../models/DishModel');

/* =========================
   UI helpers
========================= */

function adminNav(active = '') {
  const link = (href, label, key) =>
    `<a href="${href}" ${active === key ? 'class="active"' : ''}>${label}</a>`;

  return `
    ${link('/admin/reservations', 'Réservations', 'reservations')}
    ${link('/admin/menu', 'Menu', 'menu')}
    <a href="/">Site</a>
  `;
}

function shell(title, active, content) {
  return layout({
    title,
    nav: adminNav(active),
    body: `
      <div class="page">
        <div class="page__header">
          <h1>${escapeHtml(title)}</h1>
          <form method="POST" action="/auth/logout">
            <button class="btn btn--secondary" type="submit">Déconnexion</button>
          </form>
        </div>

        <div class="card">
          ${content}
        </div>
      </div>
    `
  });
}

// Surbrillance (on passe un texte déjà échappé)
function highlight(text, search) {
  if (!search) return text;
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

// Labels colonnes tri
function colLabel(col) {
  switch (col) {
    case 'id': return 'ID';
    case 'position': return 'Pos';
    case 'name': return 'Nom';
    case 'category': return 'Cat.';
    case 'price_cents': return 'Prix';
    default: return col;
  }
}

/* =========================
   Form helpers
========================= */

function dishForm({ action, dish = {}, submit }) {
  const ck = (v) => (Number(v) === 1 ? 'checked' : '');

  return `
    <style>
      mark { background-color:#ffe58a; padding:0 3px; border-radius:3px; }
      .checks{display:flex; gap:14px; flex-wrap:wrap; margin-top:6px}
      .toolbar{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}
      .searchbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
      .searchbar input{min-width:260px}
      .chk{display:flex;align-items:center;gap:6px}
      .pager{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:10px 0}
      .pager__buttons{display:flex;gap:8px;align-items:center}
      th a{color:inherit;text-decoration:none}
      th a:hover{text-decoration:underline}
    </style>

    <form method="POST" action="${action}" class="form" style="max-width:900px;">
      <div class="two-cols">
        <label>Nom
          <input name="name" required maxlength="120" value="${escapeHtml(dish.name || '')}">
        </label>

        <label>Prix (centimes)
          <input name="price_cents" type="number" min="0" required value="${escapeHtml(dish.price_cents ?? 0)}">
        </label>
      </div>

      <label>Description
        <textarea name="description" rows="4">${escapeHtml(dish.description || '')}</textarea>
      </label>

      <div class="two-cols">
        <label>Catégorie
          <select name="category" required>
            ${['ENTREE', 'PLAT', 'DESSERT', 'BOISSON'].map(c =>
              `<option value="${c}" ${dish.category === c ? 'selected' : ''}>${c}</option>`
            ).join('')}
          </select>
        </label>

        <label>Position (ordre)
          <input name="position" type="number" value="${escapeHtml(dish.position ?? 0)}">
        </label>
      </div>

      <div class="checks">
        <label><input type="checkbox" name="is_available" value="1" ${ck(dish.is_available ?? 1)}> Disponible</label>
        <label><input type="checkbox" name="is_vegetarian" value="1" ${ck(dish.is_vegetarian)}> Végétarien</label>
        <label><input type="checkbox" name="is_halal" value="1" ${ck(dish.is_halal)}> Halal</label>
        <label><input type="checkbox" name="is_spicy" value="1" ${ck(dish.is_spicy)}> Épicé</label>
      </div>

      <div class="actions-row">
        <button class="btn" type="submit">${escapeHtml(submit)}</button>
        <a class="btn btn--secondary" href="/admin/menu">Retour</a>
      </div>
    </form>
  `;
}

/* =========================
   LIST: recherche + filtres + compteurs + pagination + tri
========================= */

exports.list = (req, res) => {
  const search = (req.query.search || '').trim();
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = 20;

  const veg = req.query.veg === '1' ? 1 : 0;
  const halal = req.query.halal === '1' ? 1 : 0;
  const spicy = req.query.spicy === '1' ? 1 : 0;
  const available = req.query.available === '1' ? 1 : 0;

  // ✅ Tri
  const sort = (req.query.sort || 'position').trim();
  const dir = (req.query.dir || 'asc').trim().toLowerCase();

  const filters = { search, veg, halal, spicy, available };

  // 1️⃣ Stats + compteurs
  Dish.statsAdmin(filters, (err, statRows) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Erreur statistiques menu');
    }

    const stats = statRows?.[0] || {};
    const total = Number(stats.total || 0);

    const availableCount = Number(stats.availableCount || 0);
    const vegCount = Number(stats.vegCount || 0);
    const halalCount = Number(stats.halalCount || 0);
    const spicyCount = Number(stats.spicyCount || 0);

    const totalPages = Math.max(Math.ceil(total / limit), 1);
    const safePage = Math.min(page, totalPages);
    const safeOffset = (safePage - 1) * limit;

    // Querystring conservant recherche/filtres/tri
    const qs = (p) => {
      const sp = new URLSearchParams();
      if (search) sp.set('search', search);
      if (veg) sp.set('veg', '1');
      if (halal) sp.set('halal', '1');
      if (spicy) sp.set('spicy', '1');
      if (available) sp.set('available', '1');

      if (sort) sp.set('sort', sort);
      if (dir) sp.set('dir', dir);

      sp.set('page', String(p));
      return sp.toString();
    };
    const qsNoPage = () => {
  const sp = new URLSearchParams(qs(1));
  sp.delete('page');
  return sp.toString();
};


    // Lien de tri par colonne (toggle asc/desc)
    const sortLink = (col) => {
      const sp = new URLSearchParams();
      if (search) sp.set('search', search);
      if (veg) sp.set('veg', '1');
      if (halal) sp.set('halal', '1');
      if (spicy) sp.set('spicy', '1');
      if (available) sp.set('available', '1');

      sp.set('page', '1');
      sp.set('sort', col);

      const nextDir = (sort === col && dir === 'asc') ? 'desc' : 'asc';
      sp.set('dir', nextDir);

      const arrow = (sort === col) ? (dir === 'asc' ? ' ▲' : ' ▼') : '';
      return `<a href="/admin/menu?${sp.toString()}">${escapeHtml(colLabel(col))}${arrow}</a>`;
    };

    // 2️⃣ Liste paginée + tri
    Dish.listAdminPaged(filters, limit, safeOffset, sort, dir, (err2, rows) => {
      if (err2) {
        console.error(err2);
        return res.status(500).send('Erreur chargement menu');
      }

      const pager = `
        <div class="pager">
          <div class="muted">
            Total : <strong>${total}</strong> — Page <strong>${safePage}</strong> / <strong>${totalPages}</strong>
          </div>
          <div class="pager__buttons">
            <a class="btn btn--secondary btn--small" href="/admin/menu?${qs(1)}">⏮</a>
            <a class="btn btn--secondary btn--small" href="/admin/menu?${qs(Math.max(1, safePage - 1))}">◀</a>
            <a class="btn btn--secondary btn--small" href="/admin/menu?${qs(Math.min(totalPages, safePage + 1))}">▶</a>
            <a class="btn btn--secondary btn--small" href="/admin/menu?${qs(totalPages)}">⏭</a>
          </div>
        </div>
      `;
      const content = `
  <style>
    mark { background-color:#ffe58a; padding:0 3px; border-radius:3px; }
    .toolbar{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}
    .actions-left{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .searchbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .searchbar input{min-width:260px}
    .chk{display:flex;align-items:center;gap:6px}
    .pager{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:10px 0}
    .pager__buttons{display:flex;gap:8px;align-items:center}
    th a{color:inherit;text-decoration:none}
    th a:hover{text-decoration:underline}
    .tag{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;background:#eef2ff;margin-right:6px}
    .tag--off{background:#ffe5e5}
    td.actions{white-space:nowrap}
  </style>

  <p class="muted">
    Gestion du menu — recherche, filtres, compteurs, pagination, tri par colonnes et export.
  </p>

  <div class="toolbar">
    <div class="actions-left">
      <a class="btn" href="/admin/menu/new">+ Ajouter un plat</a>

      <!-- ✅ Export CSV / Excel (conserve recherche/filtres/tri) -->
      <a class="btn btn--secondary" href="/admin/menu/export?${qsNoPage()}">Exporter CSV</a>
      <a class="btn btn--secondary" href="/admin/menu/export-xlsx?${qsNoPage()}">Exporter Excel</a>
    </div>

    <form method="GET" action="/admin/menu" class="searchbar">
      <input type="hidden" name="page" value="1">

      <input
        name="search"
        value="${escapeHtml(search)}"
        placeholder="Rechercher (nom, description, catégorie)">

      <label class="chk">
        <input type="checkbox" name="available" value="1" ${available ? 'checked' : ''}>
        Disponible (${availableCount})
      </label>

      <label class="chk">
        <input type="checkbox" name="veg" value="1" ${veg ? 'checked' : ''}>
        Végétarien (${vegCount})
      </label>

      <label class="chk">
        <input type="checkbox" name="halal" value="1" ${halal ? 'checked' : ''}>
        Halal (${halalCount})
      </label>

      <label class="chk">
        <input type="checkbox" name="spicy" value="1" ${spicy ? 'checked' : ''}>
        Épicé (${spicyCount})
      </label>

      <!-- conserver tri lors d'un submit -->
      <input type="hidden" name="sort" value="${escapeHtml(sort)}">
      <input type="hidden" name="dir" value="${escapeHtml(dir)}">

      <button class="btn btn--secondary" type="submit">Filtrer</button>
      <a class="btn btn--secondary" href="/admin/menu">Réinitialiser</a>
    </form>
  </div>

  ${pager}

  <table class="table">
    <thead>
      <tr>
        <th>${sortLink('id')}</th>
        <th>${sortLink('position')}</th>
        <th>${sortLink('name')}</th>
        <th>Description</th>
        <th>${sortLink('category')}</th>
        <th>${sortLink('price_cents')}</th>
        <th>Tags</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      ${(rows || []).map(d => `
        <tr>
          <td>${d.id}</td>
          <td>${d.position}</td>
          <td>${highlight(escapeHtml(d.name), search)}</td>
          <td>${highlight(escapeHtml(d.description || ''), search)}</td>
          <td>${escapeHtml(d.category)}</td>
          <td>${(d.price_cents / 100).toFixed(2).replace('.', ',')} €</td>
          <td>
            ${d.is_available ? '' : `<span class="tag tag--off">OFF</span>`}
            ${d.is_vegetarian ? `<span class="tag">VEG</span>` : ''}
            ${d.is_halal ? `<span class="tag">HALAL</span>` : ''}
            ${d.is_spicy ? `<span class="tag">SPICY</span>` : ''}
          </td>
          <td class="actions">
            <a class="btn btn--small" href="/admin/menu/${d.id}/edit">Modifier</a>
            <form method="POST" action="/admin/menu/${d.id}/delete" style="display:inline;">
              <button class="btn btn--danger btn--small" type="submit">Supprimer</button>
            </form>
          </td>
        </tr>
      `).join('') || `
        <tr><td colspan="8">Aucun plat trouvé</td></tr>
      `}
    </tbody>
  </table>

  ${pager}
`;


      
        
      res.send(shell('Back-office — Menu', 'menu', content));
    });
  });
};

/* =========================
   CRUD
========================= */

exports.newPage = (req, res) => {
  const content = dishForm({
    action: '/admin/menu/new',
    dish: { category: 'PLAT', is_available: 1, position: 0 },
    submit: 'Créer'
  });
  res.send(shell('Ajouter un plat', 'menu', content));
};

exports.create = (req, res) => {
  const data = {
    ...req.body,
    is_available: req.body.is_available === '1',
    is_vegetarian: req.body.is_vegetarian === '1',
    is_halal: req.body.is_halal === '1',
    is_spicy: req.body.is_spicy === '1',
  };

  Dish.create(data, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Erreur création plat');
    }
    res.redirect('/admin/menu');
  });
};

exports.editPage = (req, res) => {
  Dish.getById(req.params.id, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Erreur chargement plat');
    }
    const dish = rows?.[0];
    if (!dish) return res.status(404).send('Plat introuvable');

    const content = dishForm({
      action: `/admin/menu/${dish.id}/edit`,
      dish,
      submit: 'Enregistrer'
    });

    res.send(shell('Modifier un plat', 'menu', content));
  });
};

exports.update = (req, res) => {
  const data = {
    ...req.body,
    is_available: req.body.is_available === '1',
    is_vegetarian: req.body.is_vegetarian === '1',
    is_halal: req.body.is_halal === '1',
    is_spicy: req.body.is_spicy === '1',
  };

  Dish.update(req.params.id, data, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Erreur mise à jour plat');
    }
    res.redirect('/admin/menu');
  });
};

exports.remove = (req, res) => {
  Dish.remove(req.params.id, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Erreur suppression plat');
    }
    res.redirect('/admin/menu');
  });
};
exports.exportCsv = (req, res) => {
  const search = (req.query.search || '').trim();
  const veg = req.query.veg === '1' ? 1 : 0;
  const halal = req.query.halal === '1' ? 1 : 0;
  const spicy = req.query.spicy === '1' ? 1 : 0;
  const available = req.query.available === '1' ? 1 : 0;

  const sort = (req.query.sort || 'position').trim();
  const dir = (req.query.dir || 'asc').trim().toLowerCase();

  const filters = { search, veg, halal, spicy, available };
  const Dish = require('../models/DishModel');

  Dish.listAdminAll(filters, sort, dir, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Erreur export CSV');
    }

    const header = [
      'id',
      'position',
      'name',
      'description',
      'category',
      'price_eur',
      'is_available',
      'is_vegetarian',
      'is_halal',
      'is_spicy'
    ];

    const csvEscape = (v) => {
      const s = String(v ?? '');
      // guillemets doubles doublés + encapsulation
      return `"${s.replaceAll('"', '""')}"`;
    };

    const lines = [];
    lines.push(header.join(';'));

    for (const d of (rows || [])) {
      const priceEur = (Number(d.price_cents || 0) / 100).toFixed(2).replace('.', ',');

      lines.push([
        d.id,
        d.position,
        d.name,
        d.description || '',
        d.category,
        priceEur,
        d.is_available,
        d.is_vegetarian,
        d.is_halal,
        d.is_spicy
      ].map(csvEscape).join(';'));
    }

    const csv = lines.join('\n');
    const filename = `menu_export_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // ✅ BOM UTF-8 pour Excel (accents OK)
    res.send('\uFEFF' + csv);
  });
};
exports.exportXlsx = async (req, res) => {
  try {
    const Dish = require('../models/DishModel');
    const ExcelJS = require('exceljs');

    const search = (req.query.search || '').trim();
    const veg = req.query.veg === '1' ? 1 : 0;
    const halal = req.query.halal === '1' ? 1 : 0;
    const spicy = req.query.spicy === '1' ? 1 : 0;
    const available = req.query.available === '1' ? 1 : 0;

    const sort = (req.query.sort || 'position').trim();
    const dir = (req.query.dir || 'asc').trim().toLowerCase();

    const filters = { search, veg, halal, spicy, available };

    // On récupère toutes les lignes (sans pagination) avec le tri en cours
    const rows = await new Promise((resolve, reject) => {
      Dish.listAdminAll(filters, sort, dir, (err, r) => {
        if (err) reject(err);
        else resolve(r || []);
      });
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Restaurant Vitrine';
    wb.created = new Date();

    const ws = wb.addWorksheet('Menu');

    // Colonnes (headers + largeur)
    ws.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Position', key: 'position', width: 10 },
      { header: 'Nom', key: 'name', width: 28 },
      { header: 'Description', key: 'description', width: 55 },
      { header: 'Catégorie', key: 'category', width: 14 },
      { header: 'Prix (€)', key: 'price_eur', width: 10 },
      { header: 'Disponible', key: 'is_available', width: 12 },
      { header: 'Végétarien', key: 'is_vegetarian', width: 12 },
      { header: 'Halal', key: 'is_halal', width: 10 },
      { header: 'Épicé', key: 'is_spicy', width: 10 },
    ];

    // Style en-tête
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).alignment = { vertical: 'middle' };
    ws.getRow(1).height = 18;

    // Données
    for (const d of rows) {
      const priceEur = Number(d.price_cents || 0) / 100;

      ws.addRow({
        id: d.id,
        position: d.position,
        name: d.name,
        description: d.description || '',
        category: d.category,
        price_eur: priceEur, // ✅ nombre (Excel)
        is_available: d.is_available ? 'Oui' : 'Non',
        is_vegetarian: d.is_vegetarian ? 'Oui' : 'Non',
        is_halal: d.is_halal ? 'Oui' : 'Non',
        is_spicy: d.is_spicy ? 'Oui' : 'Non',
      });
    }

    // Format colonne prix
    ws.getColumn('price_eur').numFmt = '#,##0.00';

    // Gel de l’en-tête + filtre Excel
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: ws.columns.length },
    };

    // Bordures légères
    ws.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
        cell.alignment = { vertical: 'top', wrapText: true };
      });
    });

    const filename = `menu_export_${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error(e);
    res.status(500).send('Erreur export Excel');
  }
};

