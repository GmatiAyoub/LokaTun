// ============================================
// Lokatun — Annonce Controller
// Gère : créer, lister, détail, modifier, supprimer
// ============================================
require('dotenv').config();
const prisma = require('../utils/prisma');
const { cloudinary } = require('../utils/cloudinary');

// ─── POST /api/annonces ────────────────────
// Créer une annonce
const creerAnnonce = async (req, res, next) => {
  try {
    const { titre, description, categorie, prixParJour, localisation, disponibilites } = req.body;

    // Validation des champs obligatoires (RM-03)
    if (!titre || !description || !categorie || !prixParJour || !localisation) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont obligatoires (titre, description, catégorie, prix, localisation)',
      });
    }

    // Validation prix minimum (RM-04)
    if (parseFloat(prixParJour) < 1) {
      return res.status(400).json({
        success: false,
        message: 'Le prix minimum est de 1 DT par jour',
      });
    }

    // Validation : au moins une photo (RM-03)
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Au moins une photo est obligatoire',
      });
    }

    // Créer l'annonce
    const annonce = await prisma.annonce.create({
      data: {
        titre,
        description,
        categorie,
        prixParJour: parseFloat(prixParJour),
        localisation,
        proprietaireId: req.user.id,
        photos: {
          create: req.files.map((file) => ({
            url: file.path,
            publicId: file.filename,
          })),
        },
        disponibilites: disponibilites
          ? {
              create: JSON.parse(disponibilites).map((d) => ({
                dateDebut: new Date(d.dateDebut),
                dateFin: new Date(d.dateFin),
              })),
            }
          : undefined,
      },
      include: {
        photos: true,
        disponibilites: true,
        proprietaire: {
          select: { id: true, nom: true, prenom: true, noteMoyenne: true },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Annonce publiée avec succès',
      annonce,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/annonces ─────────────────────
// Lister toutes les annonces avec filtres
const listerAnnonces = async (req, res, next) => {
  try {
    const { categorie, localisation, prixMin, prixMax, recherche } = req.query;

    // Construction des filtres dynamiques
    const filtres = {
      statut: 'ACTIVE',
    };

    if (categorie) filtres.categorie = categorie;
    if (localisation) filtres.localisation = { contains: localisation, mode: 'insensitive' };
    if (prixMin || prixMax) {
      filtres.prixParJour = {};
      if (prixMin) filtres.prixParJour.gte = parseFloat(prixMin);
      if (prixMax) filtres.prixParJour.lte = parseFloat(prixMax);
    }
    if (recherche) {
      filtres.OR = [
        { titre: { contains: recherche, mode: 'insensitive' } },
        { description: { contains: recherche, mode: 'insensitive' } },
      ];
    }

    const annonces = await prisma.annonce.findMany({
      where: filtres,
      include: {
        photos: true,
        proprietaire: {
          select: { id: true, nom: true, prenom: true, noteMoyenne: true },
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

// ─── GET /api/annonces/:id ─────────────────
// Détail d'une annonce
const detailAnnonce = async (req, res, next) => {
  try {
    const { id } = req.params;

    const annonce = await prisma.annonce.findUnique({
      where: { id: parseInt(id) },
      include: {
        photos: true,
        disponibilites: true,
        proprietaire: {
          select: { id: true, nom: true, prenom: true,noteMoyenne: true },
        },
      },
    });

    if (!annonce || annonce.statut === 'SUPPRIMEE') {
      return res.status(404).json({
        success: false,
        message: 'Annonce introuvable',
      });
    }

    return res.status(200).json({
      success: true,
      annonce,
    });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/annonces/:id ─────────────────
// Modifier une annonce
const modifierAnnonce = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { titre, description, categorie, prixParJour, localisation } = req.body;

    // Vérifier que l'annonce appartient à l'utilisateur connecté
    const annonce = await prisma.annonce.findUnique({ where: { id: parseInt(id) } });

    if (!annonce) {
      return res.status(404).json({ success: false, message: 'Annonce introuvable' });
    }

    if (annonce.proprietaireId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Action non autorisée' });
    }

    const annonceModifiee = await prisma.annonce.update({
      where: { id: parseInt(id) },
      data: {
        titre,
        description,
        categorie,
        prixParJour: prixParJour ? parseFloat(prixParJour) : undefined,
        localisation,
      },
      include: { photos: true, disponibilites: true },
    });

    return res.status(200).json({
      success: true,
      message: 'Annonce modifiée avec succès',
      annonce: annonceModifiee,
    });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/annonces/:id ──────────────
// Supprimer une annonce (soft delete)
const supprimerAnnonce = async (req, res, next) => {
  try {
    const { id } = req.params;

    const annonce = await prisma.annonce.findUnique({
      where: { id: parseInt(id) },
      include: { photos: true },
    });

    if (!annonce) {
      return res.status(404).json({ success: false, message: 'Annonce introuvable' });
    }

    if (annonce.proprietaireId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Action non autorisée' });
    }

    // Supprimer les photos de Cloudinary
    for (const photo of annonce.photos) {
      await cloudinary.uploader.destroy(photo.publicId);
    }

    // Soft delete — changer le statut
    await prisma.annonce.update({
      where: { id: parseInt(id) },
      data: { statut: 'SUPPRIMEE' },
    });

    return res.status(200).json({
      success: true,
      message: 'Annonce supprimée avec succès',
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/annonces/mes-annonces ───────
// Annonces de l'utilisateur connecté
const mesAnnonces = async (req, res, next) => {
  try {
    const annonces = await prisma.annonce.findMany({
      where: {
        proprietaireId: req.user.id,
        statut: { not: 'SUPPRIMEE' },
      },
      include: { photos: true, disponibilites: true },
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

module.exports = {
  creerAnnonce,
  listerAnnonces,
  detailAnnonce,
  modifierAnnonce,
  supprimerAnnonce,
  mesAnnonces,
  marquerPayee,
};