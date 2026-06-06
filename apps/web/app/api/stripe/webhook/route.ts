import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import type Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature") || "";

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return new Response("Webhook endpoint not configured", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by Stripe customer ID
        const user = await prisma.user.findFirst({
          where: { stripeId: customerId },
        });

        if (!user) {
          console.warn(`User not found for Stripe customer ${customerId}`);
          break;
        }

        // Update user plan based on price ID
        const items = subscription.items.data;
        if (items.length > 0) {
          const priceId = items[0].price.id;
          let plan = "FREE";

          if (priceId === process.env.STRIPE_PRICE_PERSONAL) {
            plan = "PERSONAL";
          } else if (priceId === process.env.STRIPE_PRICE_PRO) {
            plan = "PRO";
          } else if (priceId === process.env.STRIPE_PRICE_LIFETIME) {
            plan = "LIFETIME";
          }

          await prisma.user.update({
            where: { id: user.id },
            data: { plan: plan as any },
          });

          console.log(`Updated user ${user.id} to plan ${plan}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const user = await prisma.user.findFirst({
          where: { stripeId: customerId },
        });

        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: { plan: "FREE" },
          });

          console.log(`Downgraded user ${user.id} to FREE plan`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response("Webhook processing failed", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
