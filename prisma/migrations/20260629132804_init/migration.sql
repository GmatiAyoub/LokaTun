-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PROPRIETAIRE', 'LOCATAIRE', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIF', 'SUSPENDU', 'BANNI');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "motDePasse" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'LOCATAIRE',
    "statut" "UserStatus" NOT NULL DEFAULT 'ACTIF',
    "noteMoyenne" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nbEvaluations" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_telephone_key" ON "users"("telephone");
