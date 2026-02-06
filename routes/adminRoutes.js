const express = require('express');
const router = express.Router();

const { requireAdmin } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

router.use(requireAdmin);

router.get('/reservations', adminController.reservationsPage);
router.post('/reservations/:id/status', adminController.updateReservationStatus);
// routes/adminRoutes.js
router.get('/settings', adminController.settingsPage);
router.post('/settings', adminController.settingsSave);

module.exports = router;
