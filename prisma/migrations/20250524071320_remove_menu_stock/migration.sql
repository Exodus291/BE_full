/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `Menu` table. All the data in the column will be lost.
  - You are about to drop the column `stock` on the `Menu` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Menu" DROP COLUMN "imageUrl",
DROP COLUMN "stock";
