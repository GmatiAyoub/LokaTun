// ============================================
// Lokatun — Middleware gestion d'erreurs global
// Toujours déclaré en dernier dans index.js
// ============================================
const errorHandler = (err, req, res, next) => {
  console.error(`❌ Erreur : ${err.message}`);

  // Erreur Prisma : contrainte d'unicité
  if (err.code === 'P2002') {
    const champ = err.meta?.target?.join(', ') || 'champ';
    return res.status(409).json({
      success: false,
      message: `Ce ${champ} est déjà utilisé.`,
    });
  }

  // Erreur Prisma : enregistrement introuvable
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Ressource introuvable.',
    });
  }

  // Erreur par défaut
  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Une erreur interne est survenue.',
  });
};

module.exports = errorHandler;
