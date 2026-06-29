// ============================================
// Lokatun — Middleware Auth (JWT)
// Protège les routes nécessitant une connexion
// ============================================
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

const protect = async (req, res, next) => {
  try {
    // Récupérer le token depuis le header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Accès refusé. Veuillez vous connecter.',
      });
    }

    const token = authHeader.split(' ')[1];

    // Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Vérifier que l'utilisateur existe toujours en base
    const utilisateur = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, statut: true },
    });

    if (!utilisateur) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur introuvable. Veuillez vous reconnecter.',
      });
    }

    if (utilisateur.statut === 'SUSPENDU') {
      return res.status(403).json({
        success: false,
        message: 'Votre compte est suspendu.',
      });
    }

    // Attacher l'utilisateur à la requête
    req.user = utilisateur;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session expirée. Veuillez vous reconnecter.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Token invalide.',
    });
  }
};

// ─── Middleware de restriction par rôle ───
// Exemple : restrictTo('ADMIN') ou restrictTo('ADMIN', 'PROPRIETAIRE')
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Vous n\'avez pas les droits nécessaires.',
      });
    }
    next();
  };
};

module.exports = { protect, restrictTo };
