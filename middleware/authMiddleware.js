function requireAdmin(req, res, next) {
  if (req.session?.admin?.id) return next();
  return res.redirect('/auth/login');
}

module.exports = { requireAdmin };
