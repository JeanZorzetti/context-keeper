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

    // Get the user
    let user = await prisma.user.findUnique({
      where: { auth0Id: session.user.sub },
    });

    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
      });
    }

    // Parse request body
    const { groqApiKey, autoCommit } = await req.json();

    // Build update data - only include fields that were provided
    const updateData: any = {};
    if (groqApiKey !== undefined) {
      updateData.groqApiKey = groqApiKey || null; // Allow clearing the key
    }
    if (autoCommit !== undefined) {
      updateData.autoCommit = autoCommit;
    }

    // Update user settings
    user = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          groqApiKey: user.groqApiKey,
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
