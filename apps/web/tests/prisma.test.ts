import { describe, it, expect, beforeAll, afterAll, skip } from "vitest";
import prisma from "@/lib/prisma";

describe.skip("Prisma Client", () => {
  beforeAll(async () => {
    // Verify connection
    await prisma.$queryRaw`SELECT 1`;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should connect to database", async () => {
    const result = await prisma.$queryRaw`SELECT 1 as one`;
    expect(result).toBeDefined();
  });

  it("should create a user", async () => {
    const user = await prisma.user.create({
      data: {
        auth0Id: "test-user-123",
        email: "test@example.com",
      },
    });

    expect(user.id).toBeDefined();
    expect(user.auth0Id).toBe("test-user-123");

    // Cleanup
    await prisma.user.delete({ where: { id: user.id } });
  });

  it("should create a project with decisions", async () => {
    const user = await prisma.user.create({
      data: {
        auth0Id: "test-user-456",
        email: "test2@example.com",
      },
    });

    const project = await prisma.project.create({
      data: {
        userId: user.id,
        name: "Test Project",
        path: "/home/user/test",
      },
    });

    const decision = await prisma.decision.create({
      data: {
        projectId: project.id,
        text: "Chose Next.js over other frameworks",
        sessionId: "session-123",
      },
    });

    expect(decision.text).toBe("Chose Next.js over other frameworks");

    // Cleanup
    await prisma.decision.delete({ where: { id: decision.id } });
    await prisma.project.delete({ where: { id: project.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });
});
