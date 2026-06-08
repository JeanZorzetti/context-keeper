import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const prisma = getPrisma();
  const apiToken = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");

  if (!apiToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { apiToken } });
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  return new Response(
    JSON.stringify({
      provider: user.aiProvider ?? "groq",
      apiKey: user.aiApiKey ?? null,
      model: user.aiModel ?? null,
      baseUrl: user.aiBaseUrl ?? null,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    }
  );
}
