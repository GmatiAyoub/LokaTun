// ============================================
// Lokatun — Auth Controller
// Gère : inscription et connexion
// ============================================
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

// ─── Générer un token JWT ──────────────────
const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// ─── POST /api/auth/register ───────────────
const register = async (req, res, next) => {
  try {
    const { nom, prenom, email, telephone, motDePasse, role } = req.body;

    // Validation des champs obligatoires (US_01)
    if (!nom || !prenom || !email || !telephone || !motDePasse) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont obligatoires (nom, prénom, email, téléphone, mot de passe)',
      });
    }

    // Validation : mot de passe min 8 caractères (US_01)
    if (motDePasse.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 8 caractères',
      });
    }
    const regexTel = /^(2|4|5|9)\d{7}$/;
if (!regexTel.test(telephone)) {
  return res.status(400).json({
    success: false,
    message: 'Numéro de téléphone invalide. Entrez 8 chiffres tunisiens (ex: 55123456)',
  });
}
    // Vérifier unicité email (RM-01)
    const emailExistant = await prisma.user.findUnique({ where: { email } });
    if (emailExistant) {
      return res.status(409).json({
        success: false,
        message: 'Cette adresse email est déjà associée à un compte',
      });
    }

    // Vérifier unicité téléphone (RM-01)
    const telExistant = await prisma.user.findUnique({ where: { telephone } });
    if (telExistant) {
      return res.status(409).json({
        success: false,
        message: 'Ce numéro de téléphone est déjà associé à un compte',
      });
    }

    // Hachage du mot de passe (BNF-06)
    const motDePasseHash = await bcrypt.hash(motDePasse, 12);

    // Création de l'utilisateur
    const nouvelUtilisateur = await prisma.user.create({
      data: {
        nom,
        prenom,
        email,
        telephone,
        motDePasse: motDePasseHash,
        role: 'USER',
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        role: true,
        createdAt: true,
      },
    });

    // Générer le token
    const token = generateToken(nouvelUtilisateur.id, nouvelUtilisateur.role);

    return res.status(201).json({
      success: true,
      message: 'Compte créé avec succès. Bienvenue sur Lokatun !',
      token,
      utilisateur: nouvelUtilisateur,
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/auth/login ──────────────────
const login = async (req, res, next) => {
  try {
    const { email, motDePasse } = req.body;

    // Validation
    if (!email || !motDePasse) {
      return res.status(400).json({
        success: false,
        message: 'Email et mot de passe sont requis',
      });
    }

    // Trouver l'utilisateur
    const utilisateur = await prisma.user.findUnique({ where: { email } });
    if (!utilisateur) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect',
      });
    }

    // Vérifier statut du compte
    if (utilisateur.statut === 'SUSPENDU') {
      return res.status(403).json({
        success: false,
        message: 'Votre compte a été suspendu. Contactez l\'administrateur.',
      });
    }

    // Vérifier le mot de passe
    const motDePasseValide = await bcrypt.compare(motDePasse, utilisateur.motDePasse);
    if (!motDePasseValide) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect',
      });
    }
    

    // Générer le token
    const token = generateToken(utilisateur.id, utilisateur.role);

    return res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      token,
      utilisateur: {
        id: utilisateur.id,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        email: utilisateur.email,
        role: utilisateur.role,
        noteMoyenne: utilisateur.noteMoyenne,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/auth/me ──────────────────────
// Retourne le profil de l'utilisateur connecté
const getMe = async (req, res, next) => {
  try {
    const utilisateur = await prisma.user.findUnique({
      where: { id: req.user.id },
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
    });

    return res.status(200).json({
      success: true,
      utilisateur,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe };
