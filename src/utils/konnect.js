// ============================================
// Lokatun — Service Konnect (Paiement)
// ============================================
require('dotenv').config();
const axios = require('axios');

const KONNECT_API_URL = 'https://api.sandbox.konnect.network/api/v2';
const KONNECT_API_KEY = process.env.KONNECT_API_KEY || 'STATIQUE_EN_ATTENTE_KYC';
const KONNECT_WALLET_ID = process.env.KONNECT_WALLET_ID || 'WALLET_EN_ATTENTE_KYC';

// ─── Créer un paiement Konnect ─────────────
const creerPaiement = async ({ montant, description, reservationId, type }) => {
  try {
    const response = await axios.post(
      `${KONNECT_API_URL}/payments/init-payment`,
      {
        receiverWalletId: KONNECT_WALLET_ID,
        token: 'TND',
        amount: Math.round(montant * 1000), // Konnect utilise les millimes
        type: 'immediate',
        description: description,
        acceptedPaymentMethods: ['wallet', 'bank_card', 'e-DINAR'],
        lifespan: 30, // 30 minutes
        checkoutForm: true,
        addPaymentFeesToAmount: false,
        firstName: 'Client',
        lastName: 'Lokatun',
        orderId: `LOK-${type}-${reservationId}`,
        webhook: `${process.env.BACKEND_URL}/api/paiement/webhook`,
        successUrl: `${process.env.FRONTEND_URL}/paiement-succes/${reservationId}/${type}`,
        failUrl: `${process.env.FRONTEND_URL}/paiement-echec/${reservationId}`,
        theme: 'iOS',
      },
      {
        headers: {
          'x-api-key': KONNECT_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      success: true,
      paymentUrl: response.data.payUrl,
      paymentRef: response.data.paymentRef,
    };
  } catch (error) {
    console.error('Konnect error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || 'Erreur Konnect',
    };
  }
};

// ─── Vérifier un paiement Konnect ──────────
const verifierPaiement = async (paymentRef) => {
  try {
    const response = await axios.get(
      `${KONNECT_API_URL}/payments/${paymentRef}`,
      {
        headers: {
          'x-api-key': KONNECT_API_KEY,
        },
      }
    );

    return {
      success: true,
      statut: response.data.payment.status,
      montant: response.data.payment.amount / 1000,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || 'Erreur vérification',
    };
  }
};

module.exports = { creerPaiement, verifierPaiement };