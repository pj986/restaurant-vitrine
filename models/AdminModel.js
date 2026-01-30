const db = require('../config/db');

module.exports = {
  findByEmail: (email, callback) => {
    db.query('SELECT * FROM admins WHERE email = ? LIMIT 1', [email], callback);
  }
};
