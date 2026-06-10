import { getPrisma } from "@/lib/prisma";
import { dedupeNearDuplicates } from "@/lib/decision-dedup";

interface DecisionInput {
  text: string;
  createdAt: string;
}

export async function POST(req: Request) {
  const prisma = getPrisma();
  // 1. Auth — Bearer {userApiToken}
  const auth = req.headers.get("authorization") ?? "";
  const apiToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!apiToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  // 2. Lookup user by API token
  const user = await prisma.user.findUnique({
    where: { apiToken },
  });

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  // 2. Parse body
  let projectPath: string;
  let decisions: DecisionInput[];
  try {
    const body = await req.json();
    projectPath = body.projectPath;
    decisions = body.decisions;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  if (!projectPath || !Array.isArray(decisions) || decisions.length === 0) {
    return new Response(
      JSON.stringify({ error: "projectPath and non-empty decisions array required" }),
      { status: 400 }
    );
  }

  // 3. Get-or-create project by path. The daemon never calls /api/projects,
  // so first-seen projects are auto-registered here (name = path basename).
  let project = await prisma.project.findFirst({
    where: { path: projectPath, userId: user.id },
  });
  if (!project) {
    const projectCount = await prisma.project.count({ where: { userId: user.id } });
    const planLimits: Record<string, number> = {
      FREE: 1,
      PERSONAL: 5,
      PRO: 100,
      LIFETIME: 100,
    };
    const limit = planLimits[user.plan] ?? 100;
    if (projectCount >= limit) {
      return new Response(
        JSON.stringify({
          error: `Project limit reached for ${user.plan} plan`,
          limit,
          current: projectCount,
        }),
        { status: 403 }
      );
    }

    const projectName = projectPath.split(/[/\\]/).filter(Boolean).pop() ?? projectPath;
    project = await prisma.project.create({
      data: { userId: user.id, name: projectName, path: projectPath },
    });
  }

  // 4. Dedup — semantic near-duplicate check against existing project decisions
  const existing = await prisma.decision.findMany({
    where: { projectId: project.id },
    select: { text: true },
  });
  const existingTexts = existing.map((d) => d.text);

  const incoming = decisions.filter((d) => d.text);
  const dedupedTexts = new Set(
    dedupeNearDuplicates(incoming.map((d) => d.text), existingTexts)
  );
  const toCreate = incoming.filter((d) => dedupedTexts.has(d.text));

  if (toCreate.length > 0) {
    await prisma.decision.createMany({
      data: toCreate.map((d) => ({
        projectId: project.id,
        text: d.text,
        capturedAt: new Date(d.createdAt),
      })),
    });
  }

  return new Response(
    JSON.stringify({ saved: toCreate.length, skipped: decisions.length - toCreate.length }),
    { status: 200 }
  );
}
