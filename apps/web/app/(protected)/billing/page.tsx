import { getSession } from "@auth0/nextjs-auth0";
import prisma from "@/lib/prisma";
import Link from "next/link";

export default async function Billing() {
  const session = await getSession();

  if (!session?.user?.sub) {
    return <div>Error loading user</div>;
  }

  // Get user
  const user = await prisma.user.findUnique({
    where: { auth0Id: session.user.sub },
  });

  if (!user) {
    return <div>Error loading user</div>;
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
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing</h1>
        <p className="text-gray-600">Manage your subscription and billing details.</p>
      </div>

      {/* Current Plan */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Current Plan
        </h2>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              {currentPlan.name}
            </h3>
            <p className="text-xl text-indigo-600 mt-2">{currentPlan.price}</p>
            <ul className="mt-4 space-y-2">
              {currentPlan.features.map((feature) => (
                <li key={feature} className="text-sm text-gray-600">
                  ✓ {feature}
                </li>
              ))}
            </ul>
          </div>
          {user.plan !== "FREE" && (
            <div className="text-right">
              <button className="px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 text-sm font-medium">
                Cancel Subscription
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Available Plans */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Available Plans
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Personal */}
          <div className={`rounded-lg border-2 p-6 ${user.plan === "PERSONAL" ? "border-indigo-600 bg-indigo-50" : "border-gray-200"}`}>
            <h3 className="text-lg font-semibold text-gray-900">Personal</h3>
            <div className="text-2xl font-bold text-indigo-600 mt-2">
              $19<span className="text-sm text-gray-600">/mo</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li>✓ 5 projects</li>
              <li>✓ Claude Code</li>
              <li>✓ Email support</li>
            </ul>
            <button
              className="w-full mt-6 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
              disabled={user.plan === "PERSONAL"}
            >
              {user.plan === "PERSONAL" ? "Current Plan" : "Upgrade"}
            </button>
          </div>

          {/* Pro */}
          <div className={`rounded-lg border-2 p-6 ${user.plan === "PRO" ? "border-indigo-600 bg-indigo-50" : "border-gray-200"}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Pro</h3>
              <span className="text-xs font-semibold bg-indigo-600 text-white px-3 py-1 rounded">
                POPULAR
              </span>
            </div>
            <div className="text-2xl font-bold text-indigo-600 mt-2">
              $49<span className="text-sm text-gray-600">/mo</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li>✓ Unlimited projects</li>
              <li>✓ Multi-tool (coming)</li>
              <li>✓ Priority support</li>
              <li>✓ Team collab</li>
            </ul>
            <button
              className="w-full mt-6 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
              disabled={user.plan === "PRO"}
            >
              {user.plan === "PRO" ? "Current Plan" : "Upgrade"}
            </button>
          </div>

          {/* Lifetime */}
          <div className={`rounded-lg border-2 p-6 ${user.plan === "LIFETIME" ? "border-amber-600 bg-amber-50" : "border-gray-200"}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Lifetime</h3>
              <span className="text-xs font-semibold bg-amber-600 text-white px-3 py-1 rounded">
                EARLY BIRD
              </span>
            </div>
            <div className="text-2xl font-bold text-amber-600 mt-2">
              $149<span className="text-sm text-gray-600"> once</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li>✓ Pro features forever</li>
              <li>✓ No subscription</li>
              <li>✓ Limited slots</li>
            </ul>
            <button
              className="w-full mt-6 px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 text-sm font-medium disabled:opacity-50"
              disabled={user.plan === "LIFETIME"}
            >
              {user.plan === "LIFETIME" ? "Current Plan" : "Claim Spot"}
            </button>
          </div>
        </div>
      </div>

      {/* Billing History */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Billing History
        </h2>
        <p className="text-gray-600 text-sm">
          No billing history yet. Invoices will appear here after your first payment.
        </p>
      </div>
    </div>
  );
}
