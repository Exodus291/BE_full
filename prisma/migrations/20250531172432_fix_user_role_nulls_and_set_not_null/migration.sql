/*
  Warnings:

  - Made the column `role` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- Update existing NULL roles to 'STAFF' before making the column NOT NULL
UPDATE "User" SET "role" = 'STAFF' WHERE "role" IS NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "backgroundProfilePictureUrl" TEXT,
ALTER COLUMN "role" SET NOT NULL,
ALTER COLUMN "role" SET DEFAULT 'STAFF';
