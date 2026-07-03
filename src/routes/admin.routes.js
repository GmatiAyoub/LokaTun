// ============================================
// Lokatun — Routes Admin
// ============================================
const express = require('express');
const router = express.Router();
const {
  getUtilisateurs,
  modifierStatutUtilisateur,
  getAnnonces,
  getStats,
} = require('../controllers/admin.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');

// Toutes les routes admin nécessitent ADMIN
router.use(protect, restrictTo('ADMIN'));

router.get('/utilisateurs', getUtilisateurs);                        // GET /api/admin/utilisateurs
router.put('/utilisateurs/:id/statut', modifierStatutUtilisateur);  // PUT /api/admin/utilisateurs/:id/statut
router.get('/annonces', getAnnonces);                                // GET /api/admin/annonces
router.get('/stats', getStats);                                      // GET /api/admin/stats

module.exports = router;