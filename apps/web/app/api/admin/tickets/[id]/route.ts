import { getSession } from "@auth0/nextjs-auth0";
import { getPrisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

const VALID_STATUSES = ["OPEN", "IN_PROGRESS", "CLOSED"];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();

    if (!session?.user?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    if (!isAdmin(session.user.email)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    const body = await req.json();
    const { status } = body;

    if (!VALID_STATUSES.includes(status)) {
      return new Response(JSON.stringify({ error: "Invalid status" }), { status: 400 });
    }

    const prisma = getPrisma();
    const ticket = await prisma.ticket.update({
      where: { id },
      data: { status },
      select: { id: true, status: true },
    });

    return new Response(JSON.stringify({ ticket }), { status: 200 });
  } catch (error) {
    console.error("Error updating ticket:", error);
    return new Response(JSON.stringify({ error: "Failed to update ticket" }), { status: 500 });
  }
}
