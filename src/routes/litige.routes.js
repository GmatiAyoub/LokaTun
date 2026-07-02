// ============================================
// Lokatun — Routes Litiges
// ============================================
const express = require('express');
const router = express.Router();
const {
  signalerLitige,
  mesLitiges,
  tousLesLitiges,
  traiterLitige,
} = require('../controllers/litige.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');

router.post('/', protect, signalerLitige);                              // POST /api/litiges
router.get('/mes-litiges', protect, mesLitiges);                        // GET  /api/litiges/mes-litiges
router.get('/', protect, restrictTo('ADMIN'), tousLesLitiges);          // GET  /api/litiges (Admin)
router.put('/:id/traiter', protect, restrictTo('ADMIN'), traiterLitige); // PUT  /api/litiges/:id/traiter

module.exports = router;