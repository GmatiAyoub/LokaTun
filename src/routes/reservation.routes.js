// ============================================
// Lokatun — Routes Réservations
// ============================================
const express = require('express');
const router = express.Router();
const {
  creerReservation,
  mesReservations,
  reservationsRecues,
  accepterReservation,
  refuserReservation,
  annulerReservation,
  marquerPayee,
  marquerTerminee,
  getNotifications,
} = require('../controllers/reservation.controller');
const { protect } = require('../middlewares/auth.middleware');

router.post('/', protect, creerReservation);
router.get('/mes-reservations', protect, mesReservations);
router.get('/recues', protect, reservationsRecues);
router.get('/notifications', protect, getNotifications);
router.put('/:id/accepter', protect, accepterReservation);
router.put('/:id/refuser', protect, refuserReservation);
router.put('/:id/annuler', protect, annulerReservation);
router.put('/:id/payer', protect, marquerPayee);
router.put('/:id/terminer', protect, marquerTerminee);

module.exports = router;