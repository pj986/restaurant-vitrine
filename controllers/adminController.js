const { layout, escapeHtml } = require('../utils/html');
const ReservationModel = require('../models/ReservationModel');

function adminNav(active = '') {
  const link = (href, label, key) =>
    `<a href="${href}" ${active === key ? 'class="active"' : ''}>${label}</a>`;

  return `
    ${link('/admin/reservations', 'Réservations', 'reservations')}
    <a href="/">Site</a>
  `;
}

function adminShell(title, active, content) {
  return layout({
    title,
    nav: adminNav(active),
    body: `
      <div class="page">
        <div class="page__header">
          <div>
            <h1>${escapeHtml(title)}</h1>
            <div class="muted">Back-office restaurateur</div>
          </div>

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

function badge(status) {
  const s = String(status || '');
  if (s === 'CONFIRMED') return `<span class="tag">CONFIRMED</span>`;
  if (s === 'CANCELLED') return `<span class="tag tag--off">CANCELLED</span>`;
  return `<span class="tag" style="background:#fff7ed;color:#9a3412;">PENDING</span>`;
}

exports.reservationsPage = (req, res) => {
  ReservationModel.listAdmin((err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Erreur chargement réservations');
    }

    const tableRows = (rows || []).map(r => `
      <tr>
        <td>${escapeHtml(r.reservation_date)}</td>
        <td>${escapeHtml(r.reservation_time)}</td>
        <td>
          <strong>${escapeHtml(r.fullname)}</strong><br>
          <span class="muted">${escapeHtml(r.phone)}${r.email ? ` — ${escapeHtml(r.email)}` : ''}</span>
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
    `).join('');

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

    res.send(adminShell('Back-office — Réservations', 'reservations', content));
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
    res.redirect('/admin/reservations');
  });
};
