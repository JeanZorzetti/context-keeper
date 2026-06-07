import { getSession } from "@auth0/nextjs-auth0";
import { getStripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getSession();

    if (!session?.user?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    // Get or create user
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

    // Get or create Stripe customer
    let customerId = user.stripeId;

    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: user.email,
        metadata: {
          auth0Id: user.auth0Id,
          userId: user.id,
        },
      });

      customerId = customer.id;

      // Save Stripe customer ID to user
      user = await prisma.user.update({
        where: { id: user.id },
        data: { stripeId: customerId },
      });
    }

    // Get price ID and plan type from request
    const { priceId, planType } = await req.json();

    if (!priceId) {
      return new Response(JSON.stringify({ error: "Missing priceId" }), {
        status: 400,
      });
    }

    // Determine mode based on plan type
    const mode = planType === "LIFETIME" ? "payment" : "subscription";

    // Create checkout session
    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.AUTH0_BASE_URL}/billing?success=true`,
      cancel_url: `${process.env.AUTH0_BASE_URL}/billing`,
      metadata: {
        userId: user.id,
        auth0Id: user.auth0Id,
      },
    });

    return new Response(
      JSON.stringify({ url: checkoutSession.url }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return new Response(JSON.stringify({ error: "Checkout creation failed" }), {
      status: 500,
    });
  }
}
