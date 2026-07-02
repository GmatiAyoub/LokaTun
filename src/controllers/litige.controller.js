// ============================================
// Lokatun — Litige Controller
// ============================================
require('dotenv').config();
const prisma = require('../utils/prisma');

// ─── POST /api/litiges ─────────────────────
// Signaler un litige
const signalerLitige = async (req, res, next) => {
  try {
    const { reservationId, description } = req.body;

    if (!reservationId || !description) {
      return res.status(400).json({
        success: false,
        message: 'ReservationId et description sont obligatoires',
      });
    }

    // Vérifier que la réservation existe
    const reservation = await prisma.reservation.findUnique({
      where: { id: parseInt(reservationId) },
      include: { annonce: true },
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation introuvable',
      });
    }

    // Vérifier que l'utilisateur fait partie de la réservation
    const estLocataire = reservation.locataireId === req.user.id;
    const estProprietaire = reservation.annonce.proprietaireId === req.user.id;

    if (!estLocataire && !estProprietaire) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne faites pas partie de cette réservation',
      });
    }

    // Créer le litige
    const litige = await prisma.litige.create({
      data: {
        description,
        photoUrl: req.body.photoUrl || null,
        signaleurId: req.user.id,
        reservationId: parseInt(reservationId),
      },
      include: {
        signaleur: { select: { id: true, nom: true, prenom: true } },
        reservation: {
          include: {
            annonce: { select: { titre: true } },
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Litige signalé avec succès. L\'administrateur va traiter votre demande sous 24h.',
      litige,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/litiges/mes-litiges ──────────
// Litiges signalés par l'utilisateur connecté
const mesLitiges = async (req, res, next) => {
  try {
    const litiges = await prisma.litige.findMany({
      where: { signaleurId: req.user.id },
      include: {
        reservation: {
          include: {
            annonce: { select: { titre: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      total: litiges.length,
      litiges,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/litiges ──────────────────────
// Tous les litiges (Admin uniquement)
const tousLesLitiges = async (req, res, next) => {
  try {
    const litiges = await prisma.litige.findMany({
      include: {
        signaleur: { select: { id: true, nom: true, prenom: true, email: true } },
        reservation: {
          include: {
            annonce: { select: { titre: true } },
            locataire: { select: { id: true, nom: true, prenom: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      total: litiges.length,
      litiges,
    });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/litiges/:id/traiter ──────────
// Traiter un litige (Admin uniquement)
const traiterLitige = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { statut, resolution } = req.body;

    if (!statut) {
      return res.status(400).json({
        success: false,
        message: 'Le statut est obligatoire',
      });
    }

    const litige = await prisma.litige.update({
      where: { id: parseInt(id) },
      data: {
        statut,
        resolution: resolution || null,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Litige mis à jour avec succès',
      litige,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { signalerLitige, mesLitiges, tousLesLitiges, traiterLitige };