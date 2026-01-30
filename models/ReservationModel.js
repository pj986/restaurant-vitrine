const db = require('../config/db');

module.exports = {
  create: (data, callback) => {
    const sql = `
      INSERT INTO reservations
      (fullname, phone, email, people, reservation_date, reservation_time, message)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(sql, [
      data.fullname,
      data.phone,
      data.email || null,
      Number(data.people),
      data.reservation_date,
      data.reservation_time,
      data.message || null
    ], callback);
  },

  listAdmin: (callback) => {
    const sql = `
      SELECT * FROM reservations
      ORDER BY reservation_date DESC, reservation_time DESC, id DESC
    `;
    db.query(sql, callback);
  },

  updateStatus: (id, status, callback) => {
    const sql = `UPDATE reservations SET status = ? WHERE id = ?`;
    db.query(sql, [status, id], callback);
  }
};

