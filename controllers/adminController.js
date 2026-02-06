// controllers/adminController.js

const { shell, escapeHtml } = require('../utils/html');
const ReservationModel = require('../models/ReservationModel');
const SettingsModel = require('../models/SettingsModel');

function badge(status) {
  const s = String(status || '');
  if (s === 'CONFIRMED') return `<span class="tag">CONFIRMED</span>`;
  if (s === 'CANCELLED') return `<span class="tag tag--off">CANCELLED</span>`;
  return `<span class="tag" style="background:#fff7ed;color:#9a3412;">PENDING</span>`;
}

/**
 * Wrapper page admin : utilise le layout global (shell) défini dans utils/html.js
 * - title: titre HTML + h1
 * - active: onglet actif pour adminNav(active) dans shell()
 * - content: contenu HTML spécifique à la page
 */
function adminShell(title, active, content) {
  const body = `
    <div class="page__header" style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:16px;">
      <div>
        <h1 style="margin:0;">${escapeHtml(title)}</h1>
        <div class="muted">Back-office restaurateur</div>
      </div>

      <form method="POST" action="/auth/logout">
        <button class="btn btn--secondary" type="submit">Déconnexion</button>
      </form>
    </div>

    ${content}
  `;

  return shell(title, active, body);
}

/* =========================
   /admin/reservations
========================= */

exports.reservationsPage = (req, res) => {
  ReservationModel.listAdmin((err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Erreur chargement réservations');
    }

    const tableRows = (rows || [])
      .map(
        (r) => `
      <tr>
        <td>${escapeHtml(r.reservation_date)}</td>
        <td>${escapeHtml(r.reservation_time)}</td>
        <td>
          <strong>${escapeHtml(r.fullname)}</strong><br>
          <span class="muted">${escapeHtml(r.phone)}${
            r.email ? ` — ${escapeHtml(r.email)}` : ''
          }</span>
        </td>
        <td>${escapeHtml(r.people)}</td>
        <td>${escapeHtml(r.message || '')}</td>
        <td>${badge(r.status)}</td>
        <td class="actions">
          <form method="POST" action="/admin/reservations/${r.id}/status" style="display:flex;gap:8px;align-items:center;">
            <select name="status">
              <option value="PENDING" ${r.status === 'PENDING' ? 'selected' : ''}>PENDING</option>
              <option value="CONFIRMED" ${r.status === 'CONFIRMED' ? 'selected' : ''}>CONFIRMED</option>
              <option value="CANCELLED" ${r.status === 'CANCELLED' ? 'selected' : ''}>CANCELLED</option>
            </select>
            <button class="btn btn--small" type="submit">OK</button>
          </form>
        </td>
      </tr>
    `
      )
      .join('');

    const content = `
      <p class="muted">Liste des demandes de réservation (lecture + changement de statut).</p>

      <table class="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Heure</th>
            <th>Client</th>
            <th>Pers.</th>
            <th>Message</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows || `<tr><td colspan="7">Aucune réservation</td></tr>`}
        </tbody>
      </table>
    `;

    return res.send(adminShell('Back-office — Réservations', 'reservations', content));
  });
};

exports.updateReservationStatus = (req, res) => {
  const { status } = req.body;
  const allowed = ['PENDING', 'CONFIRMED', 'CANCELLED'];

  if (!allowed.includes(status)) {
    return res.status(400).send('Statut invalide');
  }

  ReservationModel.updateStatus(req.params.id, status, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Erreur mise à jour statut');
    }
    return res.redirect('/admin/reservations');
  });
};

/* =========================
   /admin/settings
========================= */

exports.settingsPage = (req, res) => {
  SettingsModel.get((err, s) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Erreur chargement paramètres');
    }

    const flash = req.session.settingsFlash;
    req.session.settingsFlash = null;

    const content = `
      <style>
        .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .form-grid label{display:flex;flex-direction:column;gap:6px}
        .form-grid input,.form-grid textarea{padding:10px;border:1px solid #d9e2ef;border-radius:10px}
        .form-grid textarea{min-height:110px;resize:vertical}
        .full{grid-column:1/-1}
        .badge{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;font-size:13px}
        .badge--ok{background:#e9fbe9;border:1px solid #b9f0b9}
        .badge--err{background:#ffecec;border:1px solid #ffbdbd}
        .row-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
        .hint{color:#6b7280;font-size:13px}
      </style>

      <p class="muted">Paramètres généraux du restaurant (modifiables par l’administrateur).</p>

      ${
        flash
          ? `<div class="badge ${flash.type === 'ok' ? 'badge--ok' : 'badge--err'}">
               ${flash.type === 'ok' ? '✅' : '⚠️'} ${escapeHtml(flash.message)}
             </div>`
          : ''
      }

      <form method="POST" action="/admin/settings" style="margin-top:12px;">
        <div class="form-grid">
          <label>
            Nom du restaurant
            <input name="restaurant_name" maxlength="120" value="${escapeHtml(s.restaurant_name || '')}" required>
          </label>

          <label>
            Capacité (places)
            <input name="capacity" type="number" min="1" value="${escapeHtml(String(s.capacity ?? 40))}" required>
            <span class="hint">Utilisé pour contrôler les réservations (optionnel).</span>
          </label>

          <label>
            Téléphone
            <input name="phone" maxlength="30" value="${escapeHtml(s.phone || '')}" placeholder="06..." >
          </label>

          <label>
            Email
            <input name="email" type="email" maxlength="120" value="${escapeHtml(s.email || '')}" placeholder="contact@...">
          </label>

          <label class="full">
            Adresse
            <input name="address" maxlength="255" value="${escapeHtml(s.address || '')}" placeholder="12 rue ...">
          </label>

          <label class="full">
            Horaires (texte libre)
            <textarea name="opening_hours" placeholder="Ex: Lun–Ven 11h–23h&#10;Sam–Dim 12h–00h">${escapeHtml(
              s.opening_hours || ''
            )}</textarea>
            <span class="hint">Affiché sur la page “Infos” / “Contact”.</span>
          </label>

          <label class="full" style="flex-direction:row;align-items:center;gap:10px">
            <input type="checkbox" name="reservation_enabled" value="1" ${
              Number(s.reservation_enabled) ? 'checked' : ''
            }>
            Activer les réservations en ligne
          </label>
        </div>

        <div class="row-actions">
          <button class="btn" type="submit">Enregistrer</button>
          <a class="btn btn--secondary" href="/admin/reservations">Retour</a>
        </div>
      </form>
    `;

    return res.send(adminShell('Back-office — Paramètres', 'settings', content));
  });
};

exports.settingsSave = (req, res) => {
  const payload = {
    restaurant_name: (req.body.restaurant_name || '').trim(),
    address: (req.body.address || '').trim(),
    phone: (req.body.phone || '').trim(),
    email: (req.body.email || '').trim(),
    opening_hours: (req.body.opening_hours || '').trim(),
    capacity: parseInt(req.body.capacity || '40', 10),
    reservation_enabled: req.body.reservation_enabled === '1' ? 1 : 0,
  };

  // Validations
  if (!payload.restaurant_name) {
    req.session.settingsFlash = { type: 'err', message: 'Le nom du restaurant est obligatoire.' };
    return res.redirect('/admin/settings');
  }
  if (!Number.isFinite(payload.capacity) || payload.capacity < 1) {
    req.session.settingsFlash = { type: 'err', message: 'Capacité invalide (min 1).' };
    return res.redirect('/admin/settings');
  }

  SettingsModel.update(payload, (err) => {
    if (err) {
      console.error(err);
      req.session.settingsFlash = { type: 'err', message: 'Erreur BDD : paramètres non enregistrés.' };
      return res.redirect('/admin/settings');
    }
    req.session.settingsFlash = { type: 'ok', message: 'Paramètres enregistrés.' };
    return res.redirect('/admin/settings');
  });
};
