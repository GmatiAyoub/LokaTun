// ============================================
// Lokatun — Reservation Controller
// ============================================
require('dotenv').config();
const prisma = require('../utils/prisma');

// ─── Calcul des commissions ────────────────
const calculerCommissions = (prixParJour, nombreJours) => {
  const montantBase = prixParJour * nombreJours;
  const fraisLocataire = montantBase * 0.05;       // 5% ajouté au locataire
  const montantTotal = montantBase + fraisLocataire;
  const commissionProprietaire = montantBase * 0.07; // 7% déduit du propriétaire
  const montantProprietaire = montantBase - commissionProprietaire;

  return {
    montantBase,
    fraisLocataire,
    montantTotal,
    commissionProprietaire,
    montantProprietaire,
  };
};

// ─── POST /api/reservations ────────────────
// Créer une réservation
const creerReservation = async (req, res, next) => {
  try {
    const { annonceId, dateDebut, dateFin, methodePaiement } = req.body;

    // Validation des champs
    if (!annonceId || !dateDebut || !dateFin) {
      return res.status(400).json({
        success: false,
        message: 'Annonce, date de début et date de fin sont obligatoires',
      });
    }

    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);

    // Validation : date de fin > date de début (RM-06)
    if (fin <= debut) {
      return res.status(400).json({
        success: false,
        message: 'La date de fin doit être supérieure à la date de début',
      });
    }

    // Calculer le nombre de jours
    const nombreJours = Math.ceil((fin - debut) / (1000 * 60 * 60 * 24));

    // Vérifier que l'annonce existe
    const annonce = await prisma.annonce.findUnique({
      where: { id: parseInt(annonceId) },
    });

    if (!annonce || annonce.statut !== 'ACTIVE') {
      return res.status(404).json({
        success: false,
        message: 'Annonce introuvable ou inactive',
      });
    }

    // Empêcher le propriétaire de réserver son propre objet
    if (annonce.proprietaireId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas réserver votre propre annonce',
      });
    }

    // Vérifier disponibilité — pas de chevauchement (RM-07)
    const chevauchement = await prisma.reservation.findFirst({
      where: {
        annonceId: parseInt(annonceId),
        statut: { in: ['EN_ATTENTE', 'ACCEPTEE'] },
        OR: [
          { dateDebut: { lte: fin }, dateFin: { gte: debut } },
        ],
      },
    });

    if (chevauchement) {
      return res.status(409).json({
        success: false,
        message: 'Ces dates ne sont pas disponibles, veuillez choisir d\'autres dates',
      });
    }

    // Calculer les commissions (RM-10)
    const commissions = calculerCommissions(annonce.prixParJour, nombreJours);

    // Créer la réservation
    const reservation = await prisma.reservation.create({
      data: {
        dateDebut: debut,
        dateFin: fin,
        montantBase: commissions.montantBase,
        fraisLocataire: commissions.fraisLocataire,
        montantTotal: commissions.montantTotal,
        commissionProprietaire: commissions.commissionProprietaire,
        montantProprietaire: commissions.montantProprietaire,
        methodePaiement: methodePaiement || 'CASH',
        locataireId: req.user.id,
        annonceId: parseInt(annonceId),
      },
      include: {
        annonce: {
          include: {
            proprietaire: {
              select: { id: true, nom: true, prenom: true, telephone: true },
            },
          },
        },
        locataire: {
          select: { id: true, nom: true, prenom: true },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Demande de réservation envoyée avec succès',
      reservation,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/reservations/mes-reservations ─
// Réservations du locataire connecté
const mesReservations = async (req, res, next) => {
  try {
    const reservations = await prisma.reservation.findMany({
      where: { locataireId: req.user.id },
      include: {
  annonce: {
    include: {
      photos: true,
      proprietaire: {
        select: { id: true, nom: true, prenom: true, telephone: true },
      },
    },
  },
},
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      total: reservations.length,
      reservations,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/reservations/recues ──────────
// Réservations reçues par le propriétaire
const reservationsRecues = async (req, res, next) => {
  try {
    const reservations = await prisma.reservation.findMany({
      where: {
        annonce: { proprietaireId: req.user.id },
      },
      include: {
        annonce: {
          include: { photos: true },
        },
        locataire: {
          select: { id: true, nom: true, prenom: true, telephone: true, noteMoyenne: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      total: reservations.length,
      reservations,
    });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/reservations/:id/accepter ────
const accepterReservation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const reservation = await prisma.reservation.findUnique({
      where: { id: parseInt(id) },
      include: { annonce: true },
    });

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Réservation introuvable' });
    }

    if (reservation.annonce.proprietaireId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Action non autorisée' });
    }

    if (reservation.statut !== 'EN_ATTENTE') {
      return res.status(400).json({ success: false, message: 'Cette réservation ne peut plus être modifiée' });
    }

    const updated = await prisma.reservation.update({
      where: { id: parseInt(id) },
      data: { statut: 'ACCEPTEE' },
    });

    return res.status(200).json({
      success: true,
      message: 'Réservation acceptée',
      reservation: updated,
    });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/reservations/:id/refuser ─────
const refuserReservation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const reservation = await prisma.reservation.findUnique({
      where: { id: parseInt(id) },
      include: { annonce: true },
    });

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Réservation introuvable' });
    }

    if (reservation.annonce.proprietaireId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Action non autorisée' });
    }

    if (reservation.statut !== 'EN_ATTENTE') {
      return res.status(400).json({ success: false, message: 'Cette réservation ne peut plus être modifiée' });
    }

    const updated = await prisma.reservation.update({
      where: { id: parseInt(id) },
      data: { statut: 'REFUSEE' },
    });

    return res.status(200).json({
      success: true,
      message: 'Réservation refusée',
      reservation: updated,
    });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/reservations/:id/annuler ─────
const annulerReservation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const reservation = await prisma.reservation.findUnique({
      where: { id: parseInt(id) },
    });

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Réservation introuvable' });
    }

    if (reservation.locataireId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Action non autorisée' });
    }

    if (reservation.statut !== 'EN_ATTENTE') {
      return res.status(400).json({ success: false, message: 'Seules les réservations en attente peuvent être annulées' });
    }

    const updated = await prisma.reservation.update({
      where: { id: parseInt(id) },
      data: { statut: 'ANNULEE' },
    });

    return res.status(200).json({
      success: true,
      message: 'Réservation annulée',
      reservation: updated,
    });
  } catch (error) {
    next(error);
  }
};
// ─── PUT /api/reservations/:id/payer ──────
const marquerPayee = async (req, res, next) => {
  try {
    const { id } = req.params;

    const reservation = await prisma.reservation.findUnique({
      where: { id: parseInt(id) },
    });

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Réservation introuvable' });
    }

    if (reservation.locataireId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Action non autorisée' });
    }

    if (reservation.statut !== 'ACCEPTEE') {
      return res.status(400).json({ success: false, message: 'La réservation doit être acceptée avant paiement' });
    }

    const updated = await prisma.reservation.update({
      where: { id: parseInt(id) },
      data: { statut: 'PAYEE' },
    });

    return res.status(200).json({
      success: true,
      message: 'Paiement confirmé avec succès',
      reservation: updated,
    });
  } catch (error) {
    next(error);
  }
};
// ─── PUT /api/reservations/:id/terminer ───
const marquerTerminee = async (req, res, next) => {
  try {
    const { id } = req.params;

    const reservation = await prisma.reservation.findUnique({
      where: { id: parseInt(id) },
      include: { annonce: true },
    });

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Réservation introuvable' });
    }

    if (reservation.annonce.proprietaireId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Action non autorisée' });
    }

    if (reservation.statut !== 'COMMISSION_PAYEE') {
      return res.status(400).json({
        success: false,
        message: 'Vous devez payer votre commission (7%) avant de terminer la location',
      });
    }

    const updated = await prisma.reservation.update({
      where: { id: parseInt(id) },
      data: { statut: 'TERMINEE' },
    });

    return res.status(200).json({
      success: true,
      message: 'Location terminée avec succès',
      reservation: updated,
    });
  } catch (error) {
    next(error);
  }
};
// ─── GET /api/reservations/notifications ──
const getNotifications = async (req, res, next) => {
  try {
    // Réservations EN_ATTENTE reçues (propriétaire)
    const enAttente = await prisma.reservation.count({
      where: {
        annonce: { proprietaireId: req.user.id },
        statut: 'EN_ATTENTE',
      },
    });

    // Réservations PAYEE reçues (propriétaire doit terminer)
    const payees = await prisma.reservation.count({
      where: {
        annonce: { proprietaireId: req.user.id },
        statut: 'PAYEE',
      },
    });

    // Réservations ACCEPTEE locataire (doit payer)
    const aPayerLocataire = await prisma.reservation.count({
      where: {
        locataireId: req.user.id,
        statut: 'ACCEPTEE',
      },
    });

    return res.status(200).json({
      success: true,
      notifications: {
        enAttente,
        payees,
        aPayerLocataire,
        total: enAttente + payees + aPayerLocataire,
      },
    });
  } catch (error) {
    next(error);
  }
};
// ─── PUT /api/reservations/:id/commission-payee ───
const marquerCommissionPayee = async (req, res, next) => {
  try {
    const { id } = req.params;

    const reservation = await prisma.reservation.findUnique({
      where: { id: parseInt(id) },
      include: { annonce: true },
    });

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Réservation introuvable' });
    }

    if (reservation.annonce.proprietaireId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Action non autorisée' });
    }

    if (reservation.statut !== 'PAYEE') {
      return res.status(400).json({ success: false, message: 'La réservation doit être payée par le locataire avant de payer la commission' });
    }

    const updated = await prisma.reservation.update({
      where: { id: parseInt(id) },
      data: { statut: 'COMMISSION_PAYEE' },
    });

    return res.status(200).json({
      success: true,
      message: 'Commission payée avec succès',
      reservation: updated,
    });
  } catch (error) {
    next(error);
  }
};
module.exports = {
  creerReservation,
  mesReservations,
  reservationsRecues,
  accepterReservation,
  refuserReservation,
  annulerReservation,
  marquerPayee,
  marquerTerminee,
  getNotifications,
  marquerCommissionPayee,
};