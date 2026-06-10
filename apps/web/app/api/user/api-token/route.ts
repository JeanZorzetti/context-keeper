import { getSession } from "@/lib/auth0";
import { getPrisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

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
    const user = await prisma.user.findUnique({
      where: { auth0Id: session.user.sub },
    });

    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
      });
    }

    // Generate new token
    const newToken = randomUUID();

    // Update user with new token
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { apiToken: newToken },
    });

    return new Response(
      JSON.stringify({
        success: true,
        apiToken: updatedUser.apiToken,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("API token generation error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate API token" }),
      { status: 500 }
    );
  }
}
