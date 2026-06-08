export const dynamic = 'force-dynamic';

export default function InstallationPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Installation Guide</h1>
        <p className="text-gray-600">How to install and configure Context Keeper in your development environment.</p>
      </div>

      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">What is Context Keeper?</h2>
        <p className="text-gray-700">Context Keeper is a daemon that monitors <strong>Claude Code</strong> transcripts, automatically extracts architectural decisions via <strong>Groq AI</strong>, and updates your project&apos;s <code>CLAUDE.md</code> with an indexed decision history. This ensures the context from your development sessions is never lost.</p>
      </section>

      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Prerequisites</h2>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">✓</span><span>Node.js 18 or higher</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">✓</span><span>Claude Code installed</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">✓</span><span>A Context Keeper account (<a href="https://context.nimblabs.com" className="text-indigo-600 hover:underline">context.nimblabs.com</a>) with login configured</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">✓</span><span>A Groq API key (free at <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">console.groq.com</a>)</span></li>
        </ul>
      </section>

      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">1</span>
          <h2 className="text-xl font-semibold text-gray-900">Get your Groq API key</h2>
        </div>
        <p className="text-gray-700 mb-3">Go to <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">console.groq.com</a>, create a free account, and generate an API key. Copy the generated key.</p>
      </section>

      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">2</span>
          <h2 className="text-xl font-semibold text-gray-900">Configure the key in the dashboard</h2>
        </div>
        <p className="text-gray-700">Go to <a href="/settings" className="text-indigo-600 hover:underline">Settings</a>, paste your Groq key into the <strong>&quot;Groq API Key&quot;</strong> field, and click <strong>&quot;Save API Key&quot;</strong>.</p>
      </section>

      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">3</span>
          <h2 className="text-xl font-semibold text-gray-900">Connect the daemon to your account</h2>
        </div>
        <p className="text-gray-700 mb-3">To sync captured decisions to this dashboard, the daemon needs two environment variables. Copy your <strong>API token</strong> from <a href="/settings" className="text-indigo-600 hover:underline">Settings</a>, then set:</p>
        <pre className="bg-gray-50 border border-gray-200 rounded p-4 text-sm font-mono text-gray-800 overflow-x-auto">{`CONTEXT_KEEPER_API_URL=https://context.nimblabs.com
CONTEXT_KEEPER_TOKEN=<your-api-token-from-settings>`}</pre>
        <p className="text-gray-600 text-sm mt-3">Put these in a <code>.env</code> file in your project directory, or export them in your shell before starting the daemon. <strong>Without them the daemon runs in offline mode</strong> — it still updates your local <code>CLAUDE.md</code>, but nothing appears in this dashboard.</p>
      </section>

      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">4</span>
          <h2 className="text-xl font-semibold text-gray-900">Install and start the daemon</h2>
        </div>
        <p className="text-gray-700 mb-3">In your terminal, from inside your project directory, run:</p>
        <code className="block bg-gray-50 border border-gray-200 rounded p-4 text-sm font-mono text-gray-800">npx @jeanzorzetti/context-keeper start</code>
        <p className="text-gray-600 text-sm mt-3">The daemon will stay active monitoring Claude Code transcripts. It detects new decisions, extracts context via Groq, updates <code>CLAUDE.md</code>, and syncs them to your dashboard automatically.</p>
      </section>

      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">5</span>
          <h2 className="text-xl font-semibold text-gray-900">Configure the MCP server (optional)</h2>
        </div>
        <p className="text-gray-700 mb-3">To automatically inject context at the start of each Claude Code session, add the MCP server to your <code>~/.claude/settings.json</code>:</p>
        <pre className="bg-gray-50 border border-gray-200 rounded p-4 text-sm font-mono text-gray-800 overflow-x-auto">{`{
  "mcpServers": {
    "context-keeper": {
      "command": "npx",
      "args": ["context-keeper-mcp"]
    }
  }
}`}</pre>
        <p className="text-gray-600 text-sm mt-3">With the MCP server active, Claude Code will have access to recent decisions via <code>context://current</code> and the tools <code>get_decisions</code> and <code>inject_context</code>.</p>
      </section>
    </div>
  );
}
