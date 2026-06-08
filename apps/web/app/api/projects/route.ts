import { getPrisma } from "@/lib/prisma";

interface ProjectInput {
  projectPath: string;
  projectName: string;
}

/**
 * POST /api/projects
 * Daemon endpoint for registering projects
 *
 * Auth: Bearer {userApiToken}
 * Body: { projectPath, projectName }
 * Response: { projectId, created }
 */
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

  // 3. Parse body
  let projectPath: string;
  let projectName: string;
  try {
    const body = await req.json() as ProjectInput;
    projectPath = body.projectPath;
    projectName = body.projectName;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  if (!projectPath || !projectName) {
    return new Response(
      JSON.stringify({ error: "projectPath and projectName required" }),
      { status: 400 }
    );
  }

  // 4. Get or create project
  let project = await prisma.project.findFirst({
    where: { path: projectPath },
  });

  let created = false;
  if (!project) {
    // Check plan limits before creating
    const projectCount = await prisma.project.count({
      where: { userId: user.id },
    });

    // Enforce plan limits
    const planLimits: Record<string, number> = {
      FREE: 0,
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

    project = await prisma.project.create({
      data: {
        userId: user.id,
        name: projectName,
        path: projectPath,
      },
    });
    created = true;
  } else if (project.name !== projectName) {
    // Update name if it changed
    project = await prisma.project.update({
      where: { id: project.id },
      data: { name: projectName },
    });
  }

  return new Response(
    JSON.stringify({ projectId: project.id, created }),
    { status: 200 }
  );
}
