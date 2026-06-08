import { getSession } from "@auth0/nextjs-auth0";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="flex justify-between items-center px-8 py-4 bg-white shadow-sm">
        <div className="text-2xl font-bold text-indigo-600">Context Keeper</div>
        <div className="space-x-4">
          <Link
            href="/api/auth/login"
            className="px-4 py-2 text-indigo-600 hover:text-indigo-700"
          >
            Sign In
          </Link>
          <Link
            href="/api/auth/login"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-8 py-24 max-w-4xl mx-auto text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Context Lifecycle Manager for AI Agents
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Automatically capture architectural decisions from your coding sessions.
          Context Keeper reads your session transcripts and updates your project docs.
        </p>
        <Link
          href="/api/auth/login"
          className="inline-block px-8 py-3 bg-indigo-600 text-white text-lg rounded-lg hover:bg-indigo-700"
        >
          Start Free Today
        </Link>
      </section>

      {/* Features */}
      <section className="px-8 py-16 bg-white">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold mb-2">Automatic Extraction</h3>
            <p className="text-gray-600">
              Monitor your Claude Code sessions. We detect when you're done and extract decisions.
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-lg font-semibold mb-2">Live Updates</h3>
            <p className="text-gray-600">
              Your CLAUDE.md stays current. Architectural decisions sync automatically.
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className="text-lg font-semibold mb-2">Next Agent Ready</h3>
            <p className="text-gray-600">
              Boot new agents with full context. No manual context passing needed.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-8 py-24">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Simple Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Personal */}
            <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition">
              <h3 className="text-xl font-semibold mb-2">Personal</h3>
              <div className="text-3xl font-bold text-indigo-600 mb-4">$19<span className="text-lg text-gray-600">/mo</span></div>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li>✓ 5 projects</li>
                <li>✓ Claude Code only</li>
                <li>✓ Auto-capture</li>
              </ul>
              <Link
                href="/api/auth/login"
                className="block text-center px-4 py-2 border border-indigo-600 text-indigo-600 rounded hover:bg-indigo-50"
              >
                Start Free
              </Link>
            </div>

            {/* Pro */}
            <div className="border-2 border-indigo-600 rounded-lg p-6 shadow-lg">
              <div className="bg-indigo-600 text-white text-sm font-semibold px-3 py-1 inline-block mb-2">POPULAR</div>
              <h3 className="text-xl font-semibold mb-2">Pro</h3>
              <div className="text-3xl font-bold text-indigo-600 mb-4">$49<span className="text-lg text-gray-600">/mo</span></div>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li>✓ Unlimited projects</li>
                <li>✓ Multi-tool (coming)</li>
                <li>✓ Team collab ready</li>
              </ul>
              <Link
                href="/api/auth/login"
                className="block text-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Start Free
              </Link>
            </div>

            {/* Lifetime */}
            <div className="border border-amber-400 rounded-lg p-6 hover:shadow-lg transition bg-amber-50">
              <div className="text-amber-600 text-sm font-semibold mb-2">EARLY BIRD</div>
              <h3 className="text-xl font-semibold mb-2">Lifetime</h3>
              <div className="text-3xl font-bold text-amber-600 mb-4">$149<span className="text-lg text-gray-600"> once</span></div>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li>✓ Pro features forever</li>
                <li>✓ 100 slots only</li>
                <li>✓ No subscription</li>
              </ul>
              <Link
                href="/api/auth/login"
                className="block text-center px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
              >
                Claim Spot
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white px-8 py-8">
        <div className="max-w-4xl mx-auto text-center text-gray-400">
          <p>© 2026 Context Keeper. Part of the ROI Labs family.</p>
        </div>
      </footer>
    </main>
  );
}
