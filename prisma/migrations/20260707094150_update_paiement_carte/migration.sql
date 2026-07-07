/*
  Warnings:

  - The values [D17] on the enum `MethodePaiement` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "MethodePaiement_new" AS ENUM ('CASH', 'CARTE');
ALTER TABLE "reservations" ALTER COLUMN "methodePaiement" DROP DEFAULT;
ALTER TABLE "reservations" ALTER COLUMN "methodePaiement" TYPE "MethodePaiement_new" USING ("methodePaiement"::text::"MethodePaiement_new");
ALTER TYPE "MethodePaiement" RENAME TO "MethodePaiement_old";
ALTER TYPE "MethodePaiement_new" RENAME TO "MethodePaiement";
DROP TYPE "MethodePaiement_old";
ALTER TABLE "reservations" ALTER COLUMN "methodePaiement" SET DEFAULT 'CASH';
COMMIT;
