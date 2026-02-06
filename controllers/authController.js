const bcrypt = require('bcrypt');
const { shell, escapeHtml } = require('../utils/html');

const AdminModel = require('../models/AdminModel');

function authNav() {
  return `<a href="/">Site</a>`;
}

exports.loginPage = (req, res) => {
  const error = req.query.error
    ? `<p class="error">Identifiants incorrects.</p>`
    : '';

  const body = `
    <div class="page">
      <div class="page__header">
        <h1>Connexion — Admin</h1>
        <div class="muted">Accès réservé au restaurateur</div>
      </div>

      <div class="card" style="max-width:520px;">
        ${error}
        <form method="POST" action="/auth/login" class="form">
          <label>Email
            <input name="email" type="email" required maxlength="191" placeholder="admin@restaurant.fr">
          </label>
          <label>Mot de passe
            <input name="password" type="password" required placeholder="Votre mot de passe">
          </label>

          <div class="actions-row">
            <button class="btn" type="submit">Se connecter</button>
            <a class="btn btn--secondary" href="/">Retour site</a>
          </div>
        </form>
      </div>
    </div>
  `;

  res.send(shell('Connexion — Admin', '', body));

};

exports.login = (req, res) => {
  const { email, password } = req.body;

  AdminModel.findByEmail(email, async (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Erreur serveur');
    }

    const admin = rows?.[0];
    if (!admin) return res.redirect('/auth/login?error=1');

    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) return res.redirect('/auth/login?error=1');

    req.session.admin = { id: admin.id, email: admin.email };
    return res.redirect('/admin/reservations');
  });
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth/login');
  });
};
