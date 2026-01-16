/*
  Warnings:

  - You are about to alter the column `bio` on the `user_profiles` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(280)`.
  - A unique constraint covering the columns `[username]` on the table `user_profiles` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "username" CITEXT,
ADD COLUMN     "username_set_at" TIMESTAMP(3),
ALTER COLUMN "bio" SET DATA TYPE VARCHAR(280);

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_username_key" ON "user_profiles"("username");

-- CreateIndex
CREATE INDEX "user_profiles_username_idx" ON "user_profiles"("username");
