// ============================================
// Lokatun — Routes Paiement Konnect
// ============================================
const express = require('express');
const router = express.Router();
const {
  initierPaiementLocataire,
  initierPaiementProprietaire,
  webhook,
  paiementSucces,
} = require('../controllers/paiement.controller');
const { protect } = require('../middlewares/auth.middleware');

router.post('/initier-locataire', protect, initierPaiementLocataire);
router.post('/initier-proprietaire', protect, initierPaiementProprietaire);
router.post('/webhook', webhook);
router.get('/succes/:id/:type', protect, paiementSucces);

module.exports = router;