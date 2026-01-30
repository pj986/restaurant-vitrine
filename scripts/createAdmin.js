require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../config/db');

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.log('Usage: node scripts/createAdmin.js <email> <password>');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);

  db.query('SELECT id FROM admins WHERE email = ? LIMIT 1', [email], (err, rows) => {
    if (err) {
      console.error('Erreur MySQL:', err.message);
      process.exit(1);
    }

    if (rows.length > 0) {
      console.log('Cet email admin existe déjà.');
      process.exit(0);
    }

    db.query(
      'INSERT INTO admins (email, password_hash) VALUES (?, ?)',
      [email, hash],
      (err2, result) => {
        if (err2) {
          console.error('Erreur insertion:', err2.message);
          process.exit(1);
        }
        console.log('Admin créé avec succès. ID:', result.insertId);
        process.exit(0);
      }
    );
  });
}

main();

