const express = require('express');
const router = express.Router();

const { requireAdmin } = require('../middleware/authMiddleware');
const adminMenuController = require('../controllers/adminMenuController');
console.log('importPreview type =', typeof adminMenuController.importPreview);


router.use(requireAdmin);

router.get('/', adminMenuController.list);
router.get('/new', adminMenuController.newPage);
router.post('/new', adminMenuController.create);

router.get('/import', adminMenuController.importPage);
router.post('/import/preview', adminMenuController.importPreview);
router.get('/import/preview', adminMenuController.importPreviewPage);
router.post('/import/confirm', adminMenuController.importConfirm);
router.post('/import/cancel', adminMenuController.importCancel);

router.get('/:id/edit', adminMenuController.editPage);
router.post('/:id/edit', adminMenuController.update);
router.post('/:id/delete', adminMenuController.remove);

module.exports = router;
