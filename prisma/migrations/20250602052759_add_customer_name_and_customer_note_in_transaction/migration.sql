/*
  Warnings:

  - Added the required column `customerName` to the `TransactionItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TransactionItem" ADD COLUMN     "customerName" TEXT NOT NULL,
ADD COLUMN     "customerNote" TEXT;
