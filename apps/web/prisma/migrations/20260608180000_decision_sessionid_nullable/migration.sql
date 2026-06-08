-- Daemon-pushed decisions have no session basename; allow NULL (matches schema.prisma).
ALTER TABLE "Decision" ALTER COLUMN "sessionId" DROP NOT NULL;
