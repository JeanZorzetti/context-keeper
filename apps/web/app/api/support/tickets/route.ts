import { getSession } from "@/lib/auth0";
import { getPrisma } from "@/lib/prisma";

export async function GET() {
  try {
    const prisma = getPrisma();
    const session = await getSession();

    if (!session?.user?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { auth0Id: session.user.sub },
    });

    if (!user) {
      return new Response(JSON.stringify({ tickets: [] }), { status: 200 });
    }

    const tickets = await prisma.ticket.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, subject: true, status: true, createdAt: true },
    });

    return new Response(JSON.stringify({ tickets }), { status: 200 });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch tickets" }), { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const prisma = getPrisma();
    const session = await getSession();

    if (!session?.user?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { subject, message } = await req.json();

    if (!subject?.trim() || !message?.trim()) {
      return new Response(JSON.stringify({ error: "Subject and message are required" }), { status: 400 });
    }

    let user = await prisma.user.findUnique({
      where: { auth0Id: session.user.sub },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          auth0Id: session.user.sub,
          email: session.user.email || "",
        },
      });
    }

    const ticket = await prisma.ticket.create({
      data: {
        userId: user.id,
        subject: subject.trim(),
        message: message.trim(),
      },
      select: { id: true, subject: true, status: true, createdAt: true },
    });

    return new Response(JSON.stringify({ success: true, ticket }), { status: 201 });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return new Response(JSON.stringify({ error: "Failed to create ticket" }), { status: 500 });
  }
}
