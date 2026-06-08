import { getSession } from "@auth0/nextjs-auth0";
import { getPrisma } from "@/lib/prisma";
import BillingClient from "./billing-client";

export const dynamic = 'force-dynamic';

export default async function Billing() {
  const prisma = getPrisma();
  const session = await getSession();

  if (!session?.user?.sub) {
    return <div>Error loading user</div>;
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

  const planDetails = {
    FREE: { name: "Personal", price: "Free", features: ["5 projects", "Claude Code only", "Community support"] },
    PERSONAL: {
      name: "Personal",
      price: "$19/month",
      features: ["5 projects", "Claude Code only", "Email support"],
    },
    PRO: {
      name: "Pro",
      price: "$49/month",
      features: [
        "Unlimited projects",
        "Multi-tool support (coming)",
        "Priority support",
        "Team collaboration",
      ],
    },
    LIFETIME: {
      name: "Lifetime Early-Bird",
      price: "$149 one-time",
      features: [
        "Pro features forever",
        "No subscription",
        "Lifetime updates",
      ],
    },
  };

  const currentPlan = planDetails[user.plan as keyof typeof planDetails];

  return (
    <BillingClient
      currentPlan={user.plan}
      planDetails={planDetails}
      stripePublishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""}
    />
  );
}
