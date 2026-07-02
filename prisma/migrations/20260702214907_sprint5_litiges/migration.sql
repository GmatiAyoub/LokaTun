-- CreateEnum
CREATE TYPE "StatutLitige" AS ENUM ('NOUVEAU', 'EN_COURS', 'RESOLU', 'FERME');

-- CreateTable
CREATE TABLE "litiges" (
    "id" SERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "photoUrl" TEXT,
    "statut" "StatutLitige" NOT NULL DEFAULT 'NOUVEAU',
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "signaleurId" INTEGER NOT NULL,
    "reservationId" INTEGER NOT NULL,

    CONSTRAINT "litiges_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "litiges" ADD CONSTRAINT "litiges_signaleurId_fkey" FOREIGN KEY ("signaleurId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "litiges" ADD CONSTRAINT "litiges_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
