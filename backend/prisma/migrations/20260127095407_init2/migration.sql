/*
  Warnings:

  - Added the required column `inviteRole` to the `Invitation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "inviteRole" "OrganizationMemberRole" NOT NULL;
