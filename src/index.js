require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const annonceRoutes = require('./routes/annonce.routes');
const reservationRoutes = require('./routes/reservation.routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middlewares globaux ───────────────────
app.use(cors());
app.use(express.json());

// ─── Routes ───────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/annonces', annonceRoutes);
app.use('/api/reservations', reservationRoutes);
// Route de santé (vérifier que le serveur tourne)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Lokatun API is running 🚀' });
});

// ─── Gestion des erreurs (toujours en dernier) ──
app.use(errorHandler);

// ─── Démarrage ────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Serveur Lokatun démarré sur le port ${PORT}`);
});
