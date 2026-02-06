const db = require('../config/db');

/**
 * WHERE dynamique:
 * - search : LIKE sur name/description/category
 * - veg/halal/spicy/available : filtres booléens (0/1)
 */
function buildWhere(filters, params) {
  const { search, veg, halal, spicy, available } = filters || {};
  const conditions = [];

  if (search && String(search).trim().length > 0) {
    const like = `%${String(search).trim()}%`;
    conditions.push('(name LIKE ? OR description LIKE ? OR category LIKE ?)');
    params.push(like, like, like);
  }

  if (veg === 1) conditions.push('is_vegetarian = 1');
  if (halal === 1) conditions.push('is_halal = 1');
  if (spicy === 1) conditions.push('is_spicy = 1');
  if (available === 1) conditions.push('is_available = 1');

  return conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
}

/**
 * Tri sécurisé (anti injection SQL)
 */
function getOrderBy(sort, dir) {
  const allowedSort = new Set([
    'id',
    'position',
    'name',
    'category',
    'price_cents',
    'is_available',
    'is_vegetarian',
    'is_halal',
    'is_spicy'
  ]);

  const sortCol = allowedSort.has(sort) ? sort : 'position';
  const sortDir = (String(dir).toLowerCase() === 'desc') ? 'DESC' : 'ASC';

  return `ORDER BY ${sortCol} ${sortDir}, id ASC`;
}

module.exports = {
  /* =========================
     Admin: stats / compteurs
  ========================= */

  statsAdmin(filters, cb) {
    const params = [];
    const where = buildWhere(filters, params);

    const sql = `
      SELECT
        COUNT(*) AS total,
        SUM(is_available = 1) AS availableCount,
        SUM(is_vegetarian = 1) AS vegCount,
        SUM(is_halal = 1) AS halalCount,
        SUM(is_spicy = 1) AS spicyCount
      FROM dishes
      ${where}
    `;

    db.query(sql, params, cb);
  },

  /* =========================
     Admin: pagination + tri
  ========================= */

  countAdmin(filters, cb) {
    const params = [];
    const where = buildWhere(filters, params);

    db.query(`SELECT COUNT(*) AS total FROM dishes ${where}`, params, cb);
  },

  /**
   * ✅ Compatibilité:
   * - nouvelle signature: (filters, limit, offset, sort, dir, cb)
   * - ancienne signature: (filters, limit, offset, cb)
   */
  listAdminPaged(filters, limit, offset, sort, dir, cb) {
    // ✅ Si appelé avec l'ancienne signature, "sort" est en fait le callback
    if (typeof sort === 'function') {
      cb = sort;
      sort = 'position';
      dir = 'asc';
    }

    const params = [];
    const where = buildWhere(filters, params);
    const orderBy = getOrderBy(sort, dir);

    const sql = `
      SELECT * FROM dishes
      ${where}
      ${orderBy}
      LIMIT ? OFFSET ?
    `;

    params.push(Number(limit), Number(offset));
    db.query(sql, params, cb);
  },
  listAdminAll(filters, sort, dir, cb) {
  // ✅ compat si on appelle (filters, cb)
  if (typeof sort === 'function') {
    cb = sort;
    sort = 'position';
    dir = 'asc';
  }

  const params = [];
  const where = buildWhere(filters, params);
  const orderBy = getOrderBy(sort, dir);

  const sql = `
    SELECT * FROM dishes
    ${where}
    ${orderBy}
  `;

  db.query(sql, params, cb);
},


  /* =========================
     Public: listing (optionnel)
  ========================= */

  listPublic(filters, cb) {
    const params = [];
    const f = { ...(filters || {}) };

    // Côté public, on force disponible=1 par défaut
    if (typeof f.available !== 'number') f.available = 1;

    const where = buildWhere(f, params);

    const sql = `
      SELECT * FROM dishes
      ${where}
      ORDER BY position ASC, id ASC
    `;

    db.query(sql, params, cb);
  },

  /* =========================
     CRUD
  ========================= */

  getById(id, cb) {
    db.query('SELECT * FROM dishes WHERE id = ? LIMIT 1', [id], cb);
  },

  create(data, cb) {
    const sql = `
      INSERT INTO dishes
      (name, description, price_cents, category, is_vegetarian, is_halal, is_spicy, is_available, position)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [
        data.name,
        data.description || null,
        Number(data.price_cents),
        data.category,
        data.is_vegetarian ? 1 : 0,
        data.is_halal ? 1 : 0,
        data.is_spicy ? 1 : 0,
        data.is_available ? 1 : 0,
        Number(data.position || 0)
      ],
      cb
    );
  },

  update(id, data, cb) {
    const sql = `
      UPDATE dishes
      SET name=?,
          description=?,
          price_cents=?,
          category=?,
          is_vegetarian=?,
          is_halal=?,
          is_spicy=?,
          is_available=?,
          position=?
      WHERE id=?
    `;

    db.query(
      sql,
      [
        data.name,
        data.description || null,
        Number(data.price_cents),
        data.category,
        data.is_vegetarian ? 1 : 0,
        data.is_halal ? 1 : 0,
        data.is_spicy ? 1 : 0,
        data.is_available ? 1 : 0,
        Number(data.position || 0),
        id
      ],
      cb
    );
  },

  remove(id, cb) {
    db.query('DELETE FROM dishes WHERE id=?', [id], cb);
  },
  bulkInsert(items, cb) {
  if (!items || items.length === 0) return cb(null, { affectedRows: 0 });

  const sql = `
    INSERT INTO dishes
    (name, description, price_cents, category, is_vegetarian, is_halal, is_spicy, is_available, position)
    VALUES ?
  `;

  const values = items.map(d => ([
    d.name,
    d.description || null,
    Number(d.price_cents || 0),
    d.category,
    d.is_vegetarian ? 1 : 0,
    d.is_halal ? 1 : 0,
    d.is_spicy ? 1 : 0,
    d.is_available ? 1 : 0,
    Number(d.position || 0)
  ]));

  db.query(sql, [values], cb);
},

};
