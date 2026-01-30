const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

router.get('/', publicController.homePage);
router.get('/menu', publicController.menuPage);
router.get('/infos', publicController.infosPage);

router.get('/reservation', publicController.reservationPage);
router.post('/reservation', publicController.createReservation);

module.exports = router;
