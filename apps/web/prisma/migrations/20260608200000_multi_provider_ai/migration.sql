-- Rename groqApiKey to aiApiKey and add multi-provider fields
ALTER TABLE "User" RENAME COLUMN "groqApiKey" TO "aiApiKey";
ALTER TABLE "User" ADD COLUMN "aiProvider" TEXT DEFAULT 'groq';
ALTER TABLE "User" ADD COLUMN "aiModel" TEXT;
ALTER TABLE "User" ADD COLUMN "aiBaseUrl" TEXT;
