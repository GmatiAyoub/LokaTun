// ============================================
// Lokatun — Paiement Controller (Konnect)
// ============================================
require('dotenv').config();
const prisma = require('../utils/prisma');
const { creerPaiement, verifierPaiement } = require('../utils/konnect');

// ─── POST /api/paiement/initier-locataire ──
const initierPaiementLocataire = async (req, res, next) => {
  try {
    const { reservationId } = req.body;

    const reservation = await prisma.reservation.findUnique({
      where: { id: parseInt(reservationId) },
      include: { annonce: true },
    });

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Réservation introuvable' });
    }

    if (reservation.locataireId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Action non autorisée' });
    }

    if (reservation.statut !== 'ACCEPTEE') {
      return res.status(400).json({ success: false, message: 'Réservation non acceptée' });
    }

    // Mode statique — KYC en attente
    if (!process.env.KONNECT_API_KEY || process.env.KONNECT_API_KEY === 'STATIQUE_EN_ATTENTE_KYC') {
      return res.status(200).json({
        success: true,
        statique: true,
        message: 'Mode test — Konnect sera activé après validation KYC',
        montant: reservation.fraisLocataire,
        reservationId: reservation.id,
      });
    }

    const paiement = await creerPaiement({
      montant: reservation.fraisLocataire,
      description: `Frais Lokatun — ${reservation.annonce.titre}`,
      reservationId: reservation.id,
      type: 'locataire',
    });

    if (!paiement.success) {
      return res.status(500).json({ success: false, message: paiement.error });
    }

    return res.status(200).json({
      success: true,
      paymentUrl: paiement.paymentUrl,
      paymentRef: paiement.paymentRef,
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/paiement/initier-proprietaire ──
const initierPaiementProprietaire = async (req, res, next) => {
  try {
    const { reservationId } = req.body;

    const reservation = await prisma.reservation.findUnique({
      where: { id: parseInt(reservationId) },
      include: { annonce: true },
    });

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Réservation introuvable' });
    }

    if (reservation.annonce.proprietaireId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Action non autorisée' });
    }

    if (reservation.statut !== 'PAYEE') {
      return res.status(400).json({ success: false, message: 'Le locataire doit payer en premier' });
    }

    // Mode statique — KYC en attente
    if (!process.env.KONNECT_API_KEY || process.env.KONNECT_API_KEY === 'STATIQUE_EN_ATTENTE_KYC') {
      return res.status(200).json({
        success: true,
        statique: true,
        message: 'Mode test — Konnect sera activé après validation KYC',
        montant: reservation.commissionProprietaire,
        reservationId: reservation.id,
      });
    }

    const paiement = await creerPaiement({
      montant: reservation.commissionProprietaire,
      description: `Commission Lokatun — ${reservation.annonce.titre}`,
      reservationId: reservation.id,
      type: 'proprietaire',
    });

    if (!paiement.success) {
      return res.status(500).json({ success: false, message: paiement.error });
    }

    return res.status(200).json({
      success: true,
      paymentUrl: paiement.paymentUrl,
      paymentRef: paiement.paymentRef,
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/paiement/webhook ────────────
// Konnect envoie une notification après paiement
const webhook = async (req, res, next) => {
  try {
    const { payment_ref } = req.body;

    if (!payment_ref) {
      return res.status(400).json({ success: false });
    }

    // Vérifier le paiement
    const verification = await verifierPaiement(payment_ref);

    if (!verification.success || verification.statut !== 'completed') {
      return res.status(400).json({ success: false });
    }

    // Extraire le type et reservationId depuis orderId
    // Format: LOK-locataire-{id} ou LOK-proprietaire-{id}
    const paiementInfo = await axios.get(
      `${KONNECT_API_URL}/payments/${payment_ref}`,
      { headers: { 'x-api-key': process.env.KONNECT_API_KEY } }
    );

    const orderId = paiementInfo.data.payment.orderId;
    const parts = orderId.split('-');
    const type = parts[1];
    const reservationId = parseInt(parts[2]);

    if (type === 'locataire') {
      await prisma.reservation.update({
        where: { id: reservationId },
        data: { statut: 'PAYEE' },
      });
    } else if (type === 'proprietaire') {
      await prisma.reservation.update({
        where: { id: reservationId },
        data: { statut: 'COMMISSION_PAYEE' },
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/paiement/succes/:id/:type ────
const paiementSucces = async (req, res, next) => {
  try {
    const { id, type } = req.params;
    const { payment_ref } = req.query;

    if (payment_ref) {
      const verification = await verifierPaiement(payment_ref);

      if (verification.success && verification.statut === 'completed') {
        if (type === 'locataire') {
          await prisma.reservation.update({
            where: { id: parseInt(id) },
            data: { statut: 'PAYEE' },
          });
        } else if (type === 'proprietaire') {
          await prisma.reservation.update({
            where: { id: parseInt(id) },
            data: { statut: 'COMMISSION_PAYEE' },
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Paiement confirmé',
      type,
      reservationId: id,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  initierPaiementLocataire,
  initierPaiementProprietaire,
  webhook,
  paiementSucces,
};