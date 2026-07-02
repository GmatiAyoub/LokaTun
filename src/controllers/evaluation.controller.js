// ============================================
// Lokatun — Evaluation Controller
// ============================================
require('dotenv').config();
const prisma = require('../utils/prisma');

// ─── POST /api/evaluations ─────────────────
// Créer une évaluation après une location
const creerEvaluation = async (req, res, next) => {
  try {
    const { reservationId, evalueId, note, commentaire } = req.body;

    // Validation
    if (!reservationId || !evalueId || !note) {
      return res.status(400).json({
        success: false,
        message: 'ReservationId, evalueId et note sont obligatoires',
      });
    }

    // Validation note entre 1 et 5
    if (note < 1 || note > 5) {
      return res.status(400).json({
        success: false,
        message: 'La note doit être entre 1 et 5',
      });
    }

    // Vérifier que la réservation existe et est TERMINEE (RM-13)
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

    if (reservation.statut !== 'TERMINEE') {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez évaluer qu\'après la fin de la location',
      });
    }

    // Vérifier que l'évaluateur fait partie de la réservation
    const estLocataire = reservation.locataireId === req.user.id;
    const estProprietaire = reservation.annonce.proprietaireId === req.user.id;

    if (!estLocataire && !estProprietaire) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne faites pas partie de cette réservation',
      });
    }

    // Créer l'évaluation
    const evaluation = await prisma.evaluation.create({
      data: {
        note: parseInt(note),
        commentaire,
        evaluateurId: req.user.id,
        evalueId: parseInt(evalueId),
        reservationId: parseInt(reservationId),
      },
      include: {
        evaluateur: { select: { id: true, nom: true, prenom: true } },
        evalue: { select: { id: true, nom: true, prenom: true } },
      },
    });

    // Mettre à jour la note moyenne de l'évalué (RM-03)
    const evaluations = await prisma.evaluation.findMany({
      where: { evalueId: parseInt(evalueId) },
    });

    const noteMoyenne = evaluations.reduce((acc, e) => acc + e.note, 0) / evaluations.length;

    await prisma.user.update({
      where: { id: parseInt(evalueId) },
      data: {
        noteMoyenne: Math.round(noteMoyenne * 10) / 10,
        nbEvaluations: evaluations.length,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Évaluation soumise avec succès',
      evaluation,
    });
  } catch (error) {
    // Erreur unicité — déjà évalué
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Vous avez déjà évalué cette réservation',
      });
    }
    next(error);
  }
};

// ─── GET /api/evaluations/user/:id ─────────
// Évaluations reçues par un utilisateur
const evaluationsUtilisateur = async (req, res, next) => {
  try {
    const { id } = req.params;

    const evaluations = await prisma.evaluation.findMany({
      where: { evalueId: parseInt(id) },
      include: {
        evaluateur: { select: { id: true, nom: true, prenom: true } },
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
      total: evaluations.length,
      evaluations,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { creerEvaluation, evaluationsUtilisateur };