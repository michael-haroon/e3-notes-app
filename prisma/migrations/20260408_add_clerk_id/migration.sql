-- Add Clerk integration fields
-- clerkId: links our DB user to Clerk's user identity
-- passwordHash: made nullable since Clerk-native users don't have a local password

ALTER TABLE "users" ADD COLUMN "clerkId" TEXT;
ALTER TABLE "users" ADD CONSTRAINT "users_clerkId_key" UNIQUE ("clerkId");
ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL;
