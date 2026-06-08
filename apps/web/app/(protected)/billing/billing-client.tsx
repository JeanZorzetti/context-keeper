"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

interface BillingClientProps {
  currentPlan: string;
  planDetails: Record<
    string,
    { name: string; price: string; features: string[] }
  >;
  stripePublishableKey: string;
}

export default function BillingClient({
  currentPlan,
  planDetails,
  stripePublishableKey,
}: BillingClientProps) {
  const searchParams = useSearchParams();
  const successParam = searchParams.get("success");
  const [loading, setLoading] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleUpgrade = async (planKey: string) => {
    if (currentPlan === planKey) return;

    setLoading(planKey);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType: planKey }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(`Error: ${data.error || "Failed to create checkout session"}`);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Failed to initiate checkout");
    } finally {
      setLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm("Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.")) {
      return;
    }

    setCancelLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/stripe/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({
          type: "error",
          text: data.error || "Failed to cancel subscription",
        });
        return;
      }

      setMessage({
        type: "success",
        text: `Subscription will be canceled on ${new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}. You retain access until then.`,
      });
    } catch (error) {
      console.error("Cancel error:", error);
      setMessage({
        type: "error",
        text: "Failed to cancel subscription",
      });
    } finally {
      setCancelLoading(false);
    }
  };

  const currentPlanDetails = planDetails[currentPlan as keyof typeof planDetails];

  return (
    <div>
      {/* Success Message */}
      {successParam === "true" && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm font-medium">
            ✓ Payment successful! Your plan has been updated.
          </p>
        </div>
      )}

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
              {currentPlanDetails.name}
            </h3>
            <p className="text-xl text-indigo-600 mt-2">{currentPlanDetails.price}</p>
            <ul className="mt-4 space-y-2">
              {currentPlanDetails.features.map((feature) => (
                <li key={feature} className="text-sm text-gray-600">
                  ✓ {feature}
                </li>
              ))}
            </ul>
          </div>
          {currentPlan !== "FREE" && (
            <div className="text-right space-y-3">
              {message && (
                <div
                  className={`p-3 rounded text-sm ${
                    message.type === "success"
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {message.type === "success" ? "✓" : "✕"} {message.text}
                </div>
              )}
              <button
                onClick={handleCancelSubscription}
                disabled={cancelLoading}
                className="px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelLoading ? "Canceling..." : "Cancel Subscription"}
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
          <div
            className={`rounded-lg border-2 p-6 ${
              currentPlan === "PERSONAL"
                ? "border-indigo-600 bg-indigo-50"
                : "border-gray-200"
            }`}
          >
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
              className="w-full mt-6 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentPlan === "PERSONAL" || loading === "PERSONAL"}
              onClick={() => handleUpgrade("PERSONAL")}
            >
              {loading === "PERSONAL"
                ? "Loading..."
                : currentPlan === "PERSONAL"
                  ? "Current Plan"
                  : "Upgrade"}
            </button>
          </div>

          {/* Pro */}
          <div
            className={`rounded-lg border-2 p-6 ${
              currentPlan === "PRO"
                ? "border-indigo-600 bg-indigo-50"
                : "border-gray-200"
            }`}
          >
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
              className="w-full mt-6 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentPlan === "PRO" || loading === "PRO"}
              onClick={() => handleUpgrade("PRO")}
            >
              {loading === "PRO"
                ? "Loading..."
                : currentPlan === "PRO"
                  ? "Current Plan"
                  : "Upgrade"}
            </button>
          </div>

          {/* Lifetime */}
          <div
            className={`rounded-lg border-2 p-6 ${
              currentPlan === "LIFETIME"
                ? "border-amber-600 bg-amber-50"
                : "border-gray-200"
            }`}
          >
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
              className="w-full mt-6 px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentPlan === "LIFETIME" || loading === "LIFETIME"}
              onClick={() => handleUpgrade("LIFETIME")}
            >
              {loading === "LIFETIME"
                ? "Loading..."
                : currentPlan === "LIFETIME"
                  ? "Current Plan"
                  : "Claim Spot"}
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
