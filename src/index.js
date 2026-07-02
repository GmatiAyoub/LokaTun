require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const annonceRoutes = require('./routes/annonce.routes');
const reservationRoutes = require('./routes/reservation.routes');
const evaluationRoutes = require('./routes/evaluation.routes');
const litigeRoutes = require('./routes/litige.routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/annonces', annonceRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/litiges', litigeRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Lokatun API is running 🚀' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅ Serveur Lokatun démarré sur le port ${PORT}`);
});