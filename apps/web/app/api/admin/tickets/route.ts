import { getSession } from "@/lib/auth0";
import { getPrisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export async function GET() {
  try {
    const session = await getSession();

    if (!session?.user?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    if (!isAdmin(session.user.email)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    const prisma = getPrisma();
    const tickets = await prisma.ticket.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true } },
      },
    });

    return new Response(JSON.stringify({ tickets }), { status: 200 });
  } catch (error) {
    console.error("Error fetching admin tickets:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch tickets" }), { status: 500 });
  }
}
