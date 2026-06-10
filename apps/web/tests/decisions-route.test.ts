import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  user: { findUnique: vi.fn() },
  project: { findFirst: vi.fn(), count: vi.fn(), create: vi.fn() },
  decision: { findMany: vi.fn(), createMany: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => mockPrisma,
}));

import { POST } from "@/app/api/decisions/route";

function makeRequest(body: unknown, token = "tok_user_a") {
  return new Request("http://localhost/api/decisions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

const validBody = {
  projectPath: "/home/user/app",
  decisions: [{ text: "chose X over Y because Z", createdAt: new Date().toISOString() }],
};

describe("POST /api/decisions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-a", plan: "PRO" });
    mockPrisma.decision.findMany.mockResolvedValue([]);
    mockPrisma.decision.createMany.mockResolvedValue({ count: 1 });
  });

  it("rejects requests without a token", async () => {
    const req = new Request("http://localhost/api/decisions", {
      method: "POST",
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("scopes project lookup to the authenticated user (no cross-tenant access)", async () => {
    mockPrisma.project.findFirst.mockResolvedValue({ id: "proj-1", userId: "user-a" });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);

    expect(mockPrisma.project.findFirst).toHaveBeenCalledWith({
      where: { path: "/home/user/app", userId: "user-a" },
    });
  });

  it("creates a new project for the user instead of reusing another tenant's path", async () => {
    // Same path exists for another user → findFirst scoped by userId returns null
    mockPrisma.project.findFirst.mockResolvedValue(null);
    mockPrisma.project.count.mockResolvedValue(0);
    mockPrisma.project.create.mockResolvedValue({ id: "proj-new", userId: "user-a" });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);

    expect(mockPrisma.project.create).toHaveBeenCalledWith({
      data: { userId: "user-a", name: "app", path: "/home/user/app" },
    });
  });

  it("enforces plan project limits on auto-registration", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-a", plan: "FREE" });
    mockPrisma.project.findFirst.mockResolvedValue(null);
    mockPrisma.project.count.mockResolvedValue(1);

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(403);
    expect(mockPrisma.project.create).not.toHaveBeenCalled();
  });
});
