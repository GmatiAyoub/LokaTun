// ============================================
// Lokatun — Routes Evaluations
// ============================================
const express = require('express');
const router = express.Router();
const { creerEvaluation, evaluationsUtilisateur } = require('../controllers/evaluation.controller');
const { protect } = require('../middlewares/auth.middleware');

router.post('/', protect, creerEvaluation);                    // POST /api/evaluations
router.get('/user/:id', evaluationsUtilisateur);               // GET  /api/evaluations/user/:id

module.exports = router;