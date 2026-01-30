require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./config/db');

const app = express();

// Parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static
app.use(express.static(path.join(__dirname, 'public')));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-moi',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true }
}));

// Test MySQL
db.query('SELECT 1', (err) => {
  if (err) console.error('Erreur MySQL :', err.message);
  else console.log(`Connecté à MySQL (${process.env.DB_NAME})`);
});

// Routes
app.use('/', require('./routes/publicRoutes'));
app.use('/auth', require('./routes/authRoutes'));
app.use('/admin', require('./routes/adminRoutes'));
app.use('/admin/menu', require('./routes/adminMenuRoutes'));
// 404
app.use((req, res) => res.status(404).send('Page introuvable'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});

