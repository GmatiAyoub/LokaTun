// ============================================
// Lokatun — Instance Prisma Client (singleton)
// ============================================
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = prisma;
