// ============================================
// Lokatun — Routes Annonces
// ============================================
const express = require('express');
const router = express.Router();
const {
  creerAnnonce,
  listerAnnonces,
  detailAnnonce,
  modifierAnnonce,
  supprimerAnnonce,
  mesAnnonces,
} = require('../controllers/annonce.controller');
const { protect } = require('../middlewares/auth.middleware');
const { upload } = require('../utils/cloudinary');

// Routes publiques
router.get('/', listerAnnonces);           // GET /api/annonces
router.get('/:id', detailAnnonce);         // GET /api/annonces/:id

// Routes protégées (token requis)
router.get('/user/mes-annonces', protect, mesAnnonces);           // GET /api/annonces/user/mes-annonces
router.post('/', protect, upload.array('photos', 5), creerAnnonce); // POST /api/annonces
router.put('/:id', protect, modifierAnnonce);                     // PUT /api/annonces/:id
router.delete('/:id', protect, supprimerAnnonce);                 // DELETE /api/annonces/:id

module.exports = router;