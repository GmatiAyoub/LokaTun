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
} = require('../controllers/reservation.controller');
const { protect } = require('../middlewares/auth.middleware');

// Toutes les routes réservations nécessitent un token
router.post('/', protect, creerReservation);                        // POST   /api/reservations
router.get('/mes-reservations', protect, mesReservations);          // GET    /api/reservations/mes-reservations
router.get('/recues', protect, reservationsRecues);                 // GET    /api/reservations/recues
router.put('/:id/accepter', protect, accepterReservation);         // PUT    /api/reservations/:id/accepter
router.put('/:id/refuser', protect, refuserReservation);           // PUT    /api/reservations/:id/refuser
router.put('/:id/annuler', protect, annulerReservation);           // PUT    /api/reservations/:id/annuler

module.exports = router;