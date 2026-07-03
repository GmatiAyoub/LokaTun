// ============================================
// Lokatun — Admin Controller
// ============================================
require('dotenv').config();
const prisma = require('../utils/prisma');

// ─── GET /api/admin/utilisateurs ───────────
const getUtilisateurs = async (req, res, next) => {
  try {
    const utilisateurs = await prisma.user.findMany({
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        role: true,
        statut: true,
        noteMoyenne: true,
        nbEvaluations: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      total: utilisateurs.length,
      utilisateurs,
    });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/admin/utilisateurs/:id/statut ─
const modifierStatutUtilisateur = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;

    if (!['ACTIF', 'SUSPENDU', 'BANNI'].includes(statut)) {
      return res.status(400).json({
        success: false,
        message: 'Statut invalide',
      });
    }

    // Empêcher de modifier son propre compte
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas modifier votre propre statut',
      });
    }

    const utilisateur = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { statut },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        statut: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Compte ${statut.toLowerCase()} avec succès`,
      utilisateur,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/admin/annonces ───────────────
const getAnnonces = async (req, res, next) => {
  try {
    const annonces = await prisma.annonce.findMany({
      include: {
        photos: true,
        proprietaire: {
          select: { id: true, nom: true, prenom: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      total: annonces.length,
      annonces,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/admin/stats ──────────────────
const getStats = async (req, res, next) => {
  try {
    const [totalUtilisateurs, totalAnnonces, totalReservations, totalLitiges] =
      await Promise.all([
        prisma.user.count(),
        prisma.annonce.count({ where: { statut: 'ACTIVE' } }),
        prisma.reservation.count(),
        prisma.litige.count({ where: { statut: 'NOUVEAU' } }),
      ]);

    // Calcul commissions totales
    const reservations = await prisma.reservation.findMany({
      where: { statut: { in: ['ACCEPTEE', 'TERMINEE'] } },
      select: { fraisLocataire: true, commissionProprietaire: true },
    });

    const commissionsTotal = reservations.reduce(
      (acc, r) => acc + r.fraisLocataire + r.commissionProprietaire,
      0
    );

    return res.status(200).json({
      success: true,
      stats: {
        totalUtilisateurs,
        totalAnnonces,
        totalReservations,
        totalLitiges,
        commissionsTotal: Math.round(commissionsTotal * 100) / 100,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUtilisateurs,
  modifierStatutUtilisateur,
  getAnnonces,
  getStats,
};