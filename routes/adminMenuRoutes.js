const express = require('express');
const router = express.Router();

const { requireAdmin } = require('../middleware/authMiddleware');
const adminMenuController = require('../controllers/adminMenuController');

router.use(requireAdmin);

router.get('/', adminMenuController.list);

// ✅ EXPORT CSV (à mettre AVANT "/:id/...")
router.get('/export', adminMenuController.exportCsv);
router.get('/export-xlsx', adminMenuController.exportXlsx);
router.get('/new', adminMenuController.newPage);
router.post('/new', adminMenuController.create);

router.get('/:id/edit', adminMenuController.editPage);
router.post('/:id/edit', adminMenuController.update);

router.post('/:id/delete', adminMenuController.remove);

module.exports = router;
