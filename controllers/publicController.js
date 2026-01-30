const { layout, escapeHtml } = require('../utils/html');
const ReservationModel = require('../models/ReservationModel');

function publicNav() {
  return `
    <a href="/">Accueil</a>
    <a href="/menu">Menu</a>
    <a href="/infos">Infos</a>
    <a href="/reservation">Réserver</a>
  `;
}

function pageShell(title, content) {
  return layout({
    title,
    nav: publicNav(),
    body: `
      <div class="page">
        <div class="page__header">
          <h1>${escapeHtml(title)}</h1>
          <div class="muted">Demande de réservation en ligne</div>
        </div>

        <div class="card">
          ${content}
        </div>
      </div>
    `
  });
}

exports.reservationPage = (req, res) => {
  const error = req.query.error
    ? `<p class="error">Merci de vérifier les champs : ${escapeHtml(req.query.error)}</p>`
    : '';

  const content = `
    ${error}

    <form method="POST" action="/reservation" class="form">
      <div class="two-cols">
        <label>Nom complet
          <input name="fullname" required maxlength="120" placeholder="Ex: Pierre Jordan">
        </label>

        <label>Téléphone
          <input name="phone" required maxlength="30" placeholder="Ex: 06 12 34 56 78">
        </label>
      </div>

      <div class="two-cols">
        <label>Email (optionnel)
          <input name="email" type="email" maxlength="191" placeholder="Ex: client@email.com">
        </label>

        <label>Nombre de personnes
          <input name="people" type="number" min="1" max="20" required value="2">
        </label>
      </div>

      <div class="two-cols">
        <label>Date
          <input name="reservation_date" type="date" required>
        </label>

        <label>Heure
          <input name="reservation_time" type="time" required>
        </label>
      </div>

      <label>Message (optionnel)
        <textarea name="message" rows="4" placeholder="Ex: table au calme, allergie, anniversaire..."></textarea>
      </label>

      <div class="actions-row">
        <button class="btn" type="submit">Envoyer la demande</button>
        <a class="btn btn--secondary" href="/menu">Voir le menu</a>
      </div>

      <p class="muted" style="margin-top:10px;">
        Votre demande sera traitée par le restaurant. Confirmation par téléphone ou email.
      </p>
    </form>
  `;

  res.send(pageShell('Réserver une table', content));
};

exports.createReservation = (req, res) => {
  const { fullname, phone, email, people, reservation_date, reservation_time, message } = req.body;

  // Validations simples
  const errors = [];
  if (!fullname?.trim()) errors.push('Nom');
  if (!phone?.trim()) errors.push('Téléphone');
  const peopleInt = Number(people);
  if (!Number.isInteger(peopleInt) || peopleInt < 1 || peopleInt > 20) errors.push('Personnes');
  if (!reservation_date) errors.push('Date');
  if (!reservation_time) errors.push('Heure');

  if (errors.length) {
    return res.redirect(`/reservation?error=${encodeURIComponent(errors.join(', '))}`);
  }

  ReservationModel.create(
    { fullname, phone, email, people: peopleInt, reservation_date, reservation_time, message },
    (err) => {
      if (err) {
        console.error('Erreur réservation:', err);
        return res.status(500).send(pageShell('Erreur', `<p class="error">Erreur lors de l’enregistrement.</p>`));
      }

      const content = `
        <p>Merci <strong>${escapeHtml(fullname)}</strong>, votre demande a bien été envoyée.</p>

        <div class="summary">
          <div><strong>Date :</strong> ${escapeHtml(reservation_date)}</div>
          <div><strong>Heure :</strong> ${escapeHtml(reservation_time)}</div>
          <div><strong>Personnes :</strong> ${escapeHtml(peopleInt)}</div>
          <div><strong>Téléphone :</strong> ${escapeHtml(phone)}</div>
        </div>

        <div class="actions-row" style="margin-top:14px;">
          <a class="btn" href="/">Retour accueil</a>
          <a class="btn btn--secondary" href="/reservation">Nouvelle réservation</a>
        </div>
      `;

      res.send(pageShell('Demande envoyée', content));
    }
  );
};

// Optionnel si tu n’as pas encore la page menu stylée
exports.menuPage = (req, res) => {
  res.send(pageShell('Menu', `<p class="muted">Menu en cours de branchement MySQL.</p>`));
};

// Optionnel si tu n’as pas encore /infos
exports.infosPage = (req, res) => {
  res.send(pageShell('Infos', `<p class="muted">Page infos à connecter à settings.</p>`));
};

// Optionnel si tu n’as pas encore /
exports.homePage = (req, res) => {
  res.send(layout({
    title: 'Accueil',
    nav: publicNav(),
    body: `
      <h1>Restaurant</h1>
      <p>Bienvenue. Découvrez notre menu et réservez une table en ligne.</p>
      <p>
        <a class="btn" href="/menu">Voir le menu</a>
        <a class="btn btn--secondary" href="/reservation">Réserver</a>
      </p>
    `
  }));
};
