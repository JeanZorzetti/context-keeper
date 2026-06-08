import { getSession } from "@auth0/nextjs-auth0";
import { getPrisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const prisma = getPrisma();
    const session = await getSession();

    if (!session?.user?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    let user = await prisma.user.findUnique({
      where: { auth0Id: session.user.sub },
    });

    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
      });
    }

    const { aiProvider, aiApiKey, aiModel, aiBaseUrl, autoCommit } = await req.json();

    const updateData: Record<string, unknown> = {};
    if (aiProvider !== undefined) updateData.aiProvider = aiProvider || "groq";
    if (aiApiKey !== undefined) updateData.aiApiKey = aiApiKey || null;
    if (aiModel !== undefined) updateData.aiModel = aiModel || null;
    if (aiBaseUrl !== undefined) updateData.aiBaseUrl = aiBaseUrl || null;
    if (autoCommit !== undefined) updateData.autoCommit = autoCommit;

    user = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          aiProvider: user.aiProvider,
          aiApiKey: user.aiApiKey,
          aiModel: user.aiModel,
          aiBaseUrl: user.aiBaseUrl,
          autoCommit: user.autoCommit,
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Settings update error:", error);
    return new Response(JSON.stringify({ error: "Settings update failed" }), {
      status: 500,
    });
  }
}
