const fs = require('fs');
const path = require('path');

const multer = require('multer');
const { parse } = require('csv-parse/sync');

const DishModel = require('../models/DishModel');

// ✅ Import robuste (corrige "shell is not a function")
const html = require('../utils/html');
const escapeHtml = html.escapeHtml || ((s) => String(s ?? ''));
const shell = html.shell || html; // si utils/html exporte directement une fonction

// ✅ Upload (2MB) -> /uploads
const upload = multer({
  dest: path.join(__dirname, '..', 'uploads'),
  limits: { fileSize: 2 * 1024 * 1024 },
});

/* =========================
   UI helpers
========================= */

// Surbrillance (texte déjà échappé)
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
      .two-cols{display:grid; grid-template-columns:1fr 1fr; gap:14px}
      .actions-row{display:flex; gap:10px; flex-wrap:wrap; margin-top:12px}
      @media(max-width:800px){ .two-cols{grid-template-columns:1fr} }
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

      <label style="display:block;margin-top:10px;">Description
        <textarea name="description" rows="4" style="width:100%;">${escapeHtml(dish.description || '')}</textarea>
      </label>

      <div class="two-cols" style="margin-top:10px;">
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

  const sort = (req.query.sort || 'position').trim();
  const dir = (req.query.dir || 'asc').trim().toLowerCase();

  const filters = { search, veg, halal, spicy, available };

  DishModel.statsAdmin(filters, (err, statRows) => {
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

    DishModel.listAdminPaged(filters, limit, safeOffset, sort, dir, (err2, rows) => {
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
            <a class="btn btn--secondary" href="/admin/menu/import">Importer CSV</a>

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

  DishModel.create(data, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Erreur création plat');
    }
    res.redirect('/admin/menu');
  });
};

exports.editPage = (req, res) => {
  DishModel.getById(req.params.id, (err, rows) => {
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

  DishModel.update(req.params.id, data, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Erreur mise à jour plat');
    }
    res.redirect('/admin/menu');
  });
};

exports.remove = (req, res) => {
  DishModel.remove(req.params.id, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Erreur suppression plat');
    }
    res.redirect('/admin/menu');
  });
};

/* =========================
   EXPORT
========================= */

exports.exportCsv = (req, res) => {
  const search = (req.query.search || '').trim();
  const veg = req.query.veg === '1' ? 1 : 0;
  const halal = req.query.halal === '1' ? 1 : 0;
  const spicy = req.query.spicy === '1' ? 1 : 0;
  const available = req.query.available === '1' ? 1 : 0;

  const sort = (req.query.sort || 'position').trim();
  const dir = (req.query.dir || 'asc').trim().toLowerCase();

  const filters = { search, veg, halal, spicy, available };

  DishModel.listAdminAll(filters, sort, dir, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Erreur export CSV');
    }

    const header = [
      'id','position','name','description','category','price_eur',
      'is_available','is_vegetarian','is_halal','is_spicy'
    ];

    const csvEscape = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;

    const lines = [];
    lines.push(header.join(';'));

    for (const d of (rows || [])) {
      const priceEur = (Number(d.price_cents || 0) / 100).toFixed(2).replace('.', ',');
      lines.push([
        d.id, d.position, d.name, d.description || '', d.category, priceEur,
        d.is_available, d.is_vegetarian, d.is_halal, d.is_spicy
      ].map(csvEscape).join(';'));
    }

    const csv = lines.join('\n');
    const filename = `menu_export_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv); // BOM UTF-8 Excel
  });
};

// exportXlsx: tu l’as déjà, tu peux le laisser tel quel si ça marche chez toi
// (si tu veux, je te le refais propre ensuite)

/* =========================
   IMPORT (preview -> confirm)
========================= */

exports.importPage = (req, res) => {
  const content = `
    <h2>Importer des plats (CSV)</h2>
    <p class="muted">
      Format : séparateur <strong>;</strong> et en-têtes :
      <code>name;description;category;price_eur;is_available;is_vegetarian;is_halal;is_spicy;position</code>
    </p>

    <form method="POST" action="/admin/menu/import/preview" enctype="multipart/form-data">
      <input type="file" name="file" accept=".csv,text/csv" required />
      <div style="margin-top:10px;">
        <button class="btn" type="submit">Générer l’aperçu</button>
        <a class="btn btn--secondary" href="/admin/menu">Retour</a>
      </div>
    </form>
  `;
  res.send(shell('Importer CSV', 'menu', content));
};

// ✅ IMPORTANT : ici on exporte UNE FONCTION (pas un tableau), compatible avec ton routeur
exports.importPreview = (req, res) => {
  upload.single('file')(req, res, (errUpload) => {
    if (errUpload) {
      return res.status(400).send(shell('Import CSV', 'menu', `
        <h2>Fichier refusé</h2>
        <p class="muted">${escapeHtml(errUpload.message)}</p>
        <a class="btn btn--secondary" href="/admin/menu/import">Retour</a>
      `));
    }

    if (!req.file) return res.redirect('/admin/menu/import');

    const filePath = req.file.path;
    let csvText = '';

    try {
      csvText = fs.readFileSync(filePath, 'utf8');
    } catch (e) {
      try { fs.unlinkSync(filePath); } catch {}
      return res.status(500).send('Impossible de lire le fichier CSV.');
    }

    try { fs.unlinkSync(filePath); } catch {}

    let records;
    try {
      // ✅ Ici on force ";" (ton format)
      records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ';',
        trim: true,
      });
    } catch (err) {
      req.session.importPreview = null;
      return res.status(400).send(shell('Import CSV', 'menu', `
        <h2>CSV invalide</h2>
        <p class="muted">${escapeHtml(err.message)}</p>
        <a class="btn btn--secondary" href="/admin/menu/import">Retour</a>
      `));
    }

    const allowedCategories = ['ENTREE', 'PLAT', 'DESSERT', 'BOISSON'];
    const maxPreview = 200;

    const items = records.slice(0, maxPreview).map((r) => {
      const name = (r.name || '').toString().trim();
      const description = (r.description || '').toString().trim();
      const category = (r.category || '').toString().trim().toUpperCase();

      const priceRaw = (r.price_eur || '').toString().trim().replace(',', '.');
      const priceNum = Number(priceRaw);
      const price_cents = Number.isFinite(priceNum) ? Math.round(priceNum * 100) : NaN;

      const toBool = (v) => String(v ?? '').trim() === '1';

      const is_available = toBool(r.is_available);
      const is_vegetarian = toBool(r.is_vegetarian);
      const is_halal = toBool(r.is_halal);
      const is_spicy = toBool(r.is_spicy);

      const positionRaw = (r.position || '').toString().trim();
      const position = positionRaw === '' ? 0 : Number(positionRaw);

      const errors = [];
      if (!name) errors.push('Nom manquant');
      if (!description) errors.push('Description manquante');
      if (!allowedCategories.includes(category)) errors.push(`Catégorie invalide (${category || 'vide'})`);
      if (!Number.isFinite(price_cents) || price_cents <= 0) errors.push('Prix invalide');
      if (!Number.isFinite(position) || position < 0) errors.push('Position invalide');

      return {
        name,
        description,
        category,
        price_cents: Number.isFinite(price_cents) ? price_cents : 0,
        is_available,
        is_vegetarian,
        is_halal,
        is_spicy,
        position,
        __error: errors.length ? errors.join(' • ') : '',
      };
    });

    const okItems = items.filter((x) => !x.__error);
    const badItems = items.filter((x) => x.__error);

    const errorsGlobal = [];
    if (records.length > maxPreview) {
      errorsGlobal.push(`Aperçu limité à ${maxPreview} lignes (le fichier en contient ${records.length}).`);
    }

    req.session.importPreview = {
      total: items.length,
      ok: okItems.length,
      errors: [
        ...errorsGlobal,
        ...badItems.slice(0, 50).map((x, i) => `Ligne ${i + 2} : ${(x.name || '(sans nom)')} — ${x.__error}`)
      ],
      items,
    };

    return res.redirect('/admin/menu/import/preview');
  });
};

exports.importPreviewPage = (req, res) => {
  const preview = req.session.importPreview;

  if (!preview) {
    return res.send(shell('Aperçu import CSV', 'menu', `
      <h2>Aucun aperçu en cours</h2>
      <p class="muted">Importe un fichier CSV pour afficher un aperçu avant validation.</p>
      <a class="btn btn--secondary" href="/admin/menu/import">Retour import</a>
    `));
  }

  const errorCount = (preview.errors || []).length;

  const badgeHtml = errorCount > 0
    ? `<div style="margin:10px 0;">
         <span style="display:inline-flex;align-items:center;gap:8px;background:#ffe5e5;border:1px solid #ffb3b3;padding:6px 10px;border-radius:999px;">
           <span>⚠️</span>
           <strong>${errorCount}</strong> erreur(s)
         </span>
       </div>`
    : `<div style="margin:10px 0;">
         <span style="display:inline-flex;align-items:center;gap:8px;background:#e9ffe9;border:1px solid #9be29b;padding:6px 10px;border-radius:999px;">
           <span>✅</span>
           <strong>0</strong> erreur
         </span>
       </div>`;

  const errorsHtml = (preview.errors || []).slice(0, 20).map(e => `<li>${escapeHtml(e)}</li>`).join('');

  const rowsHtml = (preview.items || []).map((d) => {
    const price = (Number(d.price_cents || 0) / 100).toFixed(2).replace('.', ',') + ' €';
    const hasError = Boolean(d.__error);

    return `
      <tr style="${hasError ? 'background:#fff1f1;' : ''}">
        <td>${escapeHtml(d.name || '')}</td>
        <td>${escapeHtml(d.description || '')}</td>
        <td>${escapeHtml(d.category || '')}</td>
        <td>${escapeHtml(price)}</td>
        <td>${d.is_available ? 'Oui' : 'Non'}</td>
        <td>${d.is_vegetarian ? 'Oui' : 'Non'}</td>
        <td>${d.is_halal ? 'Oui' : 'Non'}</td>
        <td>${d.is_spicy ? 'Oui' : 'Non'}</td>
        <td>
          ${
            hasError
              ? `<span style="display:inline-flex;align-items:center;gap:6px;color:#b00020;">
                   <span>⚠️</span> ${escapeHtml(d.__error)}
                 </span>`
              : ''
          }
        </td>
      </tr>
    `;
  }).join('');

  const actionsHtml = `
    <div style="display:flex; gap:10px; flex-wrap:wrap; margin:12px 0;">
      <a class="btn btn--secondary" href="/admin/menu/import">Retour</a>
      ${
        errorCount > 0
          ? ''
          : `
            <form method="POST" action="/admin/menu/import/confirm" style="display:inline;">
              <button class="btn" type="submit">Valider l’import (${preview.ok} plats)</button>
            </form>
            <form method="POST" action="/admin/menu/import/cancel" style="display:inline;">
              <button class="btn btn--secondary" type="submit">Annuler</button>
            </form>
          `
      }
    </div>
  `;

  const content = `
    <style>
      .table td,.table th{vertical-align:top}
      .muted{opacity:.75}
    </style>

    <h2>Aperçu avant import</h2>

    <p class="muted">
      Total lignes : <strong>${preview.total}</strong> —
      Valides : <strong>${preview.ok}</strong> —
      Erreurs : <strong>${errorCount}</strong>
    </p>

    ${badgeHtml}

    ${
      errorCount > 0
        ? `
          <div style="padding:12px;border:1px solid #ffb3b3;background:#fff7f7;border-radius:10px;margin-bottom:12px;">
            <strong>Erreurs détectées (extrait)</strong>
            <ul style="margin:8px 0 0 18px;">${errorsHtml}</ul>
            <p class="muted" style="margin-top:10px;">Corrige le CSV puis relance l’import.</p>
          </div>
        `
        : ''
    }

    ${actionsHtml}

    <table class="table">
      <thead>
        <tr>
          <th>Nom</th>
          <th>Description</th>
          <th>Catégorie</th>
          <th>Prix</th>
          <th>Dispo</th>
          <th>Veg</th>
          <th>Halal</th>
          <th>Spicy</th>
          <th>Erreur</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || `<tr><td colspan="9">Aucune ligne</td></tr>`}
      </tbody>
    </table>

    <p class="muted">Aperçu limité à 200 lignes pour la lisibilité.</p>
  `;

  return res.send(shell('Aperçu import CSV', 'menu', content));
};

exports.importConfirm = (req, res) => {
  const preview = req.session.importPreview;
  if (!preview) return res.redirect('/admin/menu/import');

  const valid = (preview.items || []).filter((x) => !x.__error);
  if (valid.length === 0) {
    return res.send(shell('Import CSV', 'menu', `
      <h2>Aucune ligne valide à importer</h2>
      <a class="btn btn--secondary" href="/admin/menu/import">Retour</a>
    `));
  }

  let i = 0;
  const next = () => {
    if (i >= valid.length) {
      req.session.importPreview = null;
      return res.redirect('/admin/menu');
    }

    const d = valid[i];

    DishModel.create({
      name: d.name,
      description: d.description,
      category: d.category,
      price_cents: d.price_cents,
      is_available: d.is_available ? 1 : 0,
      is_vegetarian: d.is_vegetarian ? 1 : 0,
      is_halal: d.is_halal ? 1 : 0,
      is_spicy: d.is_spicy ? 1 : 0,
      position: d.position || 0,
    }, (err) => {
      if (err) {
        return res.status(500).send(shell('Import CSV', 'menu', `
          <h2>Erreur insertion</h2>
          <p class="muted">${escapeHtml(err.message)}</p>
          <a class="btn btn--secondary" href="/admin/menu/import/preview">Retour aperçu</a>
        `));
      }
      i++;
      next();
    });
  };

  next();
};

exports.importCancel = (req, res) => {
  req.session.importPreview = null;
  return res.redirect('/admin/menu/import');
};
