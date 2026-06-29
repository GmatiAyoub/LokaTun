// ============================================
// Lokatun — Routes Auth
// ============================================
const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');

// Routes publiques
router.post('/register', register);  // POST /api/auth/register
router.post('/login', login);        // POST /api/auth/login

// Route protégée (token requis)
router.get('/me', protect, getMe);   // GET /api/auth/me

module.exports = router;
