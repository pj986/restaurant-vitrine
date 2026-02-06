// models/SettingsModel.js
const db = require('../config/db');

function mapRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    restaurant_name: r.restaurant_name,
    address: r.address,
    phone: r.phone,
    email: r.email,
    capacity: Number(r.capacity || 0),
    reservation_enabled: Number(r.reservation_enabled || 0) ? 1 : 0,
    opening_hours: r.opening_hours || '',
    updated_at: r.updated_at,
  };
}

exports.get = (cb) => {
  db.query('SELECT * FROM settings WHERE id = 1 LIMIT 1', (err, rows) => {
    if (err) return cb(err);
    const s = mapRow(rows && rows[0]);
    // si pas de ligne, on renvoie une config par défaut
    if (!s) {
      return cb(null, {
        id: 1,
        restaurant_name: 'Mon Restaurant',
        address: '',
        phone: '',
        email: '',
        capacity: 40,
        reservation_enabled: 1,
        opening_hours: '',
        updated_at: null,
      });
    }
    cb(null, s);
  });
};

exports.update = (data, cb) => {
  // 1 ligne unique (id=1)
  const payload = {
    restaurant_name: data.restaurant_name ?? 'Mon Restaurant',
    address: data.address ?? '',
    phone: data.phone ?? '',
    email: data.email ?? '',
    capacity: Number.isFinite(Number(data.capacity)) ? Number(data.capacity) : 40,
    reservation_enabled: Number(data.reservation_enabled) ? 1 : 0,
    opening_hours: data.opening_hours ?? '',
  };

  db.query(
    `
    INSERT INTO settings (id, restaurant_name, address, phone, email, capacity, reservation_enabled, opening_hours)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      restaurant_name = VALUES(restaurant_name),
      address = VALUES(address),
      phone = VALUES(phone),
      email = VALUES(email),
      capacity = VALUES(capacity),
      reservation_enabled = VALUES(reservation_enabled),
      opening_hours = VALUES(opening_hours)
    `,
    [
      payload.restaurant_name,
      payload.address,
      payload.phone,
      payload.email,
      payload.capacity,
      payload.reservation_enabled,
      payload.opening_hours,
    ],
    cb
  );
};
