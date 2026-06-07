import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY is not defined");
    }
    stripeClient = new Stripe(apiKey, {
      apiVersion: "2025-02-24.acacia",
    });
  }
  return stripeClient;
}

export const getStripeCheckoutSessionUrl = async (
  stripeSessionId: string
): Promise<string | null> => {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(stripeSessionId);
  return session.url;
};

export const createCheckoutSession = async (
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
) => {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return session;
};
