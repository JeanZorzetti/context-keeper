import { getSession } from "@/lib/auth0";
import { getStripe } from "@/lib/stripe";
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

    // Get user
    const user = await prisma.user.findUnique({
      where: { auth0Id: session.user.sub },
    });

    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
      });
    }

    if (!user.stripeId) {
      return new Response(
        JSON.stringify({ error: "No active subscription found" }),
        { status: 400 }
      );
    }

    // Get active subscriptions for this customer
    const subscriptions = await getStripe().subscriptions.list({
      customer: user.stripeId,
      status: "active",
      limit: 1,
    });

    if (!subscriptions.data || subscriptions.data.length === 0) {
      return new Response(
        JSON.stringify({ error: "No active subscription found" }),
        { status: 400 }
      );
    }

    const subscription = subscriptions.data[0];

    // Cancel the subscription at the end of the current billing period
    const canceledSubscription = await getStripe().subscriptions.update(
      subscription.id,
      {
        cancel_at_period_end: true,
      }
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: "Subscription will be canceled at the end of the billing period",
        subscription: {
          id: canceledSubscription.id,
          cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
          currentPeriodEnd: new Date(
            canceledSubscription.current_period_end * 1000
          ).toISOString(),
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Stripe cancel error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to cancel subscription" }),
      { status: 500 }
    );
  }
}
