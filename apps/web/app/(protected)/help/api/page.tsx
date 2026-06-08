export const dynamic = 'force-dynamic';

export default function ApiDocsPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">API Documentation</h1>
        <p className="text-gray-600">Endpoints available in Context Keeper. All require authentication via Auth0 session (session cookie set automatically after login).</p>
      </div>

      <section className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">Authentication</h2>
        <p className="text-blue-800 text-sm">API endpoints use Auth0 session via cookie (set automatically after login at <code>/api/auth/login</code>). Requests without a valid session return <code>401 Unauthorized</code>.</p>
      </section>

      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-bold rounded">POST</span>
          <code className="text-gray-900 font-mono">/api/settings</code>
        </div>
        <p className="text-gray-700 text-sm mb-4">Updates the authenticated user&apos;s settings.</p>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Body (JSON)</h4>
        <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-sm font-mono text-gray-800 overflow-x-auto mb-4">{`{
  "groqApiKey": "gsk_...",   // string | null — Groq key (null to clear)
  "autoCommit": true         // boolean — auto commit
}`}</pre>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Response 200</h4>
        <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-sm font-mono text-gray-800 overflow-x-auto">{`{
  "success": true,
  "user": { "id": "...", "groqApiKey": "gsk_...", "autoCommit": true }
}`}</pre>
      </section>

      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-bold rounded">POST</span>
          <code className="text-gray-900 font-mono">/api/user/api-token</code>
        </div>
        <p className="text-gray-700 text-sm mb-4">Generates a new API token for the authenticated user. The previous token is invalidated.</p>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Body</h4>
        <p className="text-sm text-gray-600 mb-4">No body — only the Auth0 session is required.</p>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Response 200</h4>
        <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-sm font-mono text-gray-800 overflow-x-auto">{`{
  "success": true,
  "apiToken": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}`}</pre>
      </section>

      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-bold rounded">POST</span>
          <code className="text-gray-900 font-mono">/api/stripe/checkout</code>
        </div>
        <p className="text-gray-700 text-sm mb-4">Creates a Stripe checkout session for a plan upgrade.</p>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Body (JSON)</h4>
        <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-sm font-mono text-gray-800 overflow-x-auto mb-4">{`{
  "priceId": "price_...",      // string — Stripe price ID
  "planType": "PERSONAL"       // "PERSONAL" | "PRO" | "LIFETIME"
}`}</pre>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Response 200</h4>
        <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-sm font-mono text-gray-800 overflow-x-auto">{`{ "url": "https://checkout.stripe.com/..." }`}</pre>
      </section>

      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-bold rounded">POST</span>
          <code className="text-gray-900 font-mono">/api/stripe/cancel</code>
        </div>
        <p className="text-gray-700 text-sm mb-4">Cancels the active subscription at the end of the current billing period.</p>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Body</h4>
        <p className="text-sm text-gray-600 mb-4">No body.</p>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Response 200</h4>
        <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-sm font-mono text-gray-800 overflow-x-auto">{`{
  "success": true,
  "message": "Subscription will be canceled at period end",
  "subscription": { "id": "sub_...", "cancelAtPeriodEnd": true, "currentPeriodEnd": "..." }
}`}</pre>
      </section>
    </div>
  );
}
