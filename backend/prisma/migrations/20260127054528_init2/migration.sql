/*
  Warnings:

  - The values [MEMBER] on the enum `OrganizationMemberRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "OrganizationMemberRole_new" AS ENUM ('ADMIN', 'DRIVER', 'VIEWER');
ALTER TABLE "OrganizationMember" ALTER COLUMN "role" TYPE "OrganizationMemberRole_new" USING ("role"::text::"OrganizationMemberRole_new");
ALTER TYPE "OrganizationMemberRole" RENAME TO "OrganizationMemberRole_old";
ALTER TYPE "OrganizationMemberRole_new" RENAME TO "OrganizationMemberRole";
DROP TYPE "public"."OrganizationMemberRole_old";
COMMIT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false;
