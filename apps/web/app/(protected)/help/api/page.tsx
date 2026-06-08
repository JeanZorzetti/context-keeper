export const dynamic = 'force-dynamic';

export default function ApiDocsPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Documentação da API</h1>
        <p className="text-gray-600">Endpoints disponíveis no Context Keeper. Todos exigem autenticação via sessão Auth0 (cookie de sessão obtido após login).</p>
      </div>

      <section className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">Autenticação</h2>
        <p className="text-blue-800 text-sm">Os endpoints da API utilizam sessão Auth0 via cookie (definido automaticamente após login em <code>/api/auth/login</code>). Requisições sem sessão válida retornam <code>401 Unauthorized</code>.</p>
      </section>

      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-bold rounded">POST</span>
          <code className="text-gray-900 font-mono">/api/settings</code>
        </div>
        <p className="text-gray-700 text-sm mb-4">Atualiza as configurações do usuário autenticado.</p>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Body (JSON)</h4>
        <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-sm font-mono text-gray-800 overflow-x-auto mb-4">{`{
  "groqApiKey": "gsk_...",   // string | null — chave Groq (null para limpar)
  "autoCommit": true         // boolean — commit automático
}`}</pre>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Resposta 200</h4>
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
        <p className="text-gray-700 text-sm mb-4">Gera um novo token de API para o usuário autenticado. O token anterior é invalidado.</p>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Body</h4>
        <p className="text-sm text-gray-600 mb-4">Sem body — apenas a sessão Auth0 é necessária.</p>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Resposta 200</h4>
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
        <p className="text-gray-700 text-sm mb-4">Cria uma sessão de checkout Stripe para upgrade de plano.</p>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Body (JSON)</h4>
        <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-sm font-mono text-gray-800 overflow-x-auto mb-4">{`{
  "priceId": "price_...",      // string — ID do preço Stripe
  "planType": "PERSONAL"       // "PERSONAL" | "PRO" | "LIFETIME"
}`}</pre>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Resposta 200</h4>
        <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-sm font-mono text-gray-800 overflow-x-auto">{`{ "url": "https://checkout.stripe.com/..." }`}</pre>
      </section>

      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-bold rounded">POST</span>
          <code className="text-gray-900 font-mono">/api/stripe/cancel</code>
        </div>
        <p className="text-gray-700 text-sm mb-4">Cancela a assinatura ativa ao final do período de cobrança atual.</p>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Body</h4>
        <p className="text-sm text-gray-600 mb-4">Sem body.</p>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Resposta 200</h4>
        <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-sm font-mono text-gray-800 overflow-x-auto">{`{
  "success": true,
  "message": "Subscription will be canceled at period end",
  "subscription": { "id": "sub_...", "cancelAtPeriodEnd": true, "currentPeriodEnd": "..." }
}`}</pre>
      </section>
    </div>
  );
}
