-- CreateEnum
CREATE TYPE "StatutReservation" AS ENUM ('EN_ATTENTE', 'ACCEPTEE', 'REFUSEE', 'ANNULEE', 'TERMINEE');

-- CreateEnum
CREATE TYPE "MethodePaiement" AS ENUM ('CASH', 'D17');

-- CreateTable
CREATE TABLE "reservations" (
    "id" SERIAL NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "montantBase" DOUBLE PRECISION NOT NULL,
    "fraisLocataire" DOUBLE PRECISION NOT NULL,
    "montantTotal" DOUBLE PRECISION NOT NULL,
    "commissionProprietaire" DOUBLE PRECISION NOT NULL,
    "montantProprietaire" DOUBLE PRECISION NOT NULL,
    "methodePaiement" "MethodePaiement" NOT NULL DEFAULT 'CASH',
    "statut" "StatutReservation" NOT NULL DEFAULT 'EN_ATTENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "locataireId" INTEGER NOT NULL,
    "annonceId" INTEGER NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_locataireId_fkey" FOREIGN KEY ("locataireId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_annonceId_fkey" FOREIGN KEY ("annonceId") REFERENCES "annonces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
