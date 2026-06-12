import { getSession } from "@/lib/auth0";
import { redirect } from "next/navigation";
import Link from "next/link";
import { JetBrains_Mono } from "next/font/google";
import CopyCommand from "@/components/landing/copy-command";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jbm",
});

const GITHUB_URL = "https://github.com/JeanZorzetti/context-keeper";

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg
      className={className ?? "w-6 h-6"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

const icons = {
  check: "M20 6L9 17l-5-5",
  arrow: "M5 12h14M12 5l7 7-7 7",
  chat: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  clock: "M12 6v6l4 2M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z",
  loop: "M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5",
  sparkles:
    "M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3L12 3z",
  wifiOff:
    "M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.58 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01",
  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  dashboard:
    "M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z",
  filter: "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  server:
    "M2 4h20v6H2zM2 14h20v6H2zM6 7h.01M6 17h.01",
  bot: "M12 2v3M5 9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM9 13h.01M15 13h.01",
  cpu: "M9 9h6v6H9zM4 4h16v16H4zM9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3",
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8",
};

const features = [
  {
    icon: icons.sparkles,
    title: "Automatic decision extraction",
    text: "Parses your natural conversations to find the architecture choices.",
  },
  {
    icon: icons.wifiOff,
    title: "Works offline",
    text: "Local-first approach. Bring your own LLM key.",
  },
  {
    icon: icons.zap,
    title: "Session-end hook",
    text: "Zero friction. Runs automatically when your session ends.",
  },
  {
    icon: icons.dashboard,
    title: "Cloud dashboard",
    text: "See all your projects and their captured decisions in one place.",
  },
  {
    icon: icons.filter,
    title: "Quality gate",
    text: "No generic noise. Only impactful architectural choices are recorded.",
  },
  {
    icon: icons.server,
    title: "MCP server included",
    text: "Natively compatible with the Model Context Protocol.",
  },
];

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    badge: null,
    features: ["1 project", "Local context daemon", "Bring your own LLM key"],
    cta: "Start Free",
    highlight: false,
  },
  {
    name: "Personal",
    price: "$19",
    period: "/mo",
    badge: "MOST POPULAR",
    features: ["5 projects", "Cloud dashboard sync", "Email support"],
    cta: "Get Personal",
    highlight: true,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/mo",
    badge: null,
    features: ["Unlimited projects", "Team collab (coming)", "Priority support"],
    cta: "Get Pro",
    highlight: false,
  },
  {
    name: "Lifetime",
    price: "$149",
    period: " once",
    badge: "EARLY BIRD",
    features: ["Pro features forever", "No subscription", "Limited slots"],
    cta: "Claim Spot",
    highlight: false,
  },
];

const problems = [
  { icon: icons.chat, text: "Decisions buried in chat logs" },
  { icon: icons.clock, text: "CLAUDE.md always stale" },
  { icon: icons.loop, text: "New sessions start from zero" },
];

const ctaButton =
  "bg-[#6d3bd7] hover:bg-[#7d4be7] text-white rounded transition-all duration-200 shadow-[0_0_20px_rgba(109,59,215,0.15)] hover:shadow-[0_0_30px_rgba(109,59,215,0.3)]";
const glassBorder = "border border-white/[0.08]";

export default async function Home() {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div
      className={`${jetbrainsMono.variable} min-h-screen flex flex-col bg-[#0A0A0F] text-[#e1e3e4] [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)] [background-size:32px_32px]`}
    >
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0A0A0F]/80 backdrop-blur-md">
        <div className="flex justify-between items-center max-w-7xl mx-auto px-4 md:px-8 h-16">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="text-xl font-bold tracking-tight hover:text-[#d0bcff] transition-colors"
            >
              Context Keeper
            </Link>
            <div className="hidden md:flex items-center gap-6 text-[#cbc3d7]">
              <a href="#how-it-works" className="hover:text-[#d0bcff] transition-colors">
                How it works
              </a>
              <a href="#pricing" className="hover:text-[#d0bcff] transition-colors">
                Pricing
              </a>
              <Link href="/blog" className="hover:text-[#d0bcff] transition-colors">
                Blog
              </Link>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#d0bcff] transition-colors"
              >
                Docs
              </a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/api/auth/login"
              className="hidden md:block text-sm hover:text-[#d0bcff] transition-colors"
            >
              Sign in
            </a>
            <a href="/api/auth/login" className={`px-4 py-2 text-sm ${ctaButton}`}>
              Start free
            </a>
          </div>
        </div>
      </nav>

      <main className="flex-grow flex flex-col">
        {/* Hero */}
        <section className="max-w-7xl mx-auto w-full px-4 md:px-8 pt-20 pb-28 flex flex-col lg:flex-row items-center gap-16">
          <div className="w-full lg:w-1/2 flex flex-col gap-8 z-10">
            <div
              className={`inline-flex items-center gap-2 ${glassBorder} bg-white/[0.03] px-3 py-1.5 rounded-full w-max backdrop-blur-sm`}
            >
              <span className="w-2 h-2 rounded-full bg-[#d0bcff] animate-pulse" />
              <span className="font-mono text-[11px] tracking-wider uppercase text-[#cbc3d7]">
                v1.2.0 Released
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl leading-[1.1] font-bold tracking-tight">
              Your AI agent forgets.
              <br />
              <span className="text-[#d0bcff]">Your project shouldn&apos;t.</span>
            </h1>
            <p className="text-lg text-[#cbc3d7] max-w-lg">
              Context Keeper captures every architectural decision from your Claude Code,
              Cursor and Cline sessions — automatically.
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-2">
              <a
                href="/api/auth/login"
                className={`px-6 py-3 flex items-center gap-2 ${ctaButton}`}
              >
                Start free
                <Icon d={icons.arrow} className="w-[18px] h-[18px]" />
              </a>
              <CopyCommand />
            </div>
          </div>
          <div className="w-full lg:w-1/2 relative">
            <div className="absolute -inset-10 bg-[#d0bcff]/5 blur-[100px] rounded-full z-0" />
            <div className="relative z-10 flex flex-col">
              {/* Terminal window */}
              <div
                className={`bg-[#050508] rounded-lg ${glassBorder} border-t-white/[0.15] overflow-hidden shadow-2xl shadow-black/50`}
              >
                <div className="bg-black/20 border-b border-white/5 px-4 py-2 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#494454]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#494454]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#494454]" />
                  <span className="font-mono text-[11px] text-[#958ea0] ml-4">
                    daemon process
                  </span>
                </div>
                <div className="p-6 font-mono text-sm text-[#cbc3d7] flex flex-col gap-2">
                  <div>
                    <span className="text-[#958ea0]">&gt;</span>{" "}
                    <span className="text-[#d0bcff]">context-keeper</span> watch .
                  </div>
                  <div className="text-[#d0bcff] mt-2">✓ Attached to active Claude Code session</div>
                  <div className="animate-pulse">⠋ Monitoring conversation context...</div>
                  <div className="mt-4 text-[#494454]">
                    {"// Decision detected: Using Redis for caching"}
                  </div>
                  <div>
                    <span className="text-[#958ea0]">❯</span> Extracting architectural
                    rationale...
                  </div>
                  <div className="text-[#d0bcff]">✓ Synthesized into structural memory</div>
                  <div>
                    <span className="text-[#958ea0]">❯</span> Updating CLAUDE.md...{" "}
                    <span className={`text-xs ${glassBorder} px-1 py-0.5 rounded`}>DONE</span>
                  </div>
                </div>
              </div>
              {/* CLAUDE.md snippet */}
              <div
                className={`bg-[#111415] rounded-lg ${glassBorder} border-t-white/[0.15] overflow-hidden ml-8 -mt-10 shadow-2xl shadow-black/50 z-20`}
              >
                <div className="bg-black/20 border-b border-white/5 px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon d={icons.file} className="w-4 h-4 text-[#958ea0]" />
                    <span className="font-mono text-[11px]">CLAUDE.md</span>
                  </div>
                  <span className="font-mono text-[11px] text-[#d0bcff] bg-[#d0bcff]/10 px-2 py-0.5 rounded">
                    Updated
                  </span>
                </div>
                <div className="p-6 font-mono text-sm text-[#cbc3d7] flex flex-col gap-1">
                  <div>
                    <span className="text-[#d0bcff] font-bold">#</span> Project Context
                  </div>
                  <div className="h-2" />
                  <div>
                    <span className="text-[#d0bcff] font-bold">##</span> Architecture
                    Decisions
                  </div>
                  <div>
                    <span className="text-[#958ea0]">-</span> Auth: JWT with HTTP-only
                    cookies
                  </div>
                  <div>
                    <span className="text-[#958ea0]">-</span> DB: PostgreSQL (Prisma ORM)
                  </div>
                  <div className="bg-[#d0bcff]/10 border-l-2 border-[#d0bcff] -ml-6 pl-6 py-1 text-[#e1e3e4]">
                    <span className="text-[#d0bcff]">-</span> Caching: Redis (Implemented to
                    reduce DB load on complex queries)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Problem strip */}
        <section className="border-y border-white/[0.08] bg-white/[0.02] py-12">
          <div className="max-w-7xl mx-auto w-full px-4 md:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 divide-y md:divide-y-0 md:divide-x divide-white/[0.08]">
              {problems.map((p) => (
                <div key={p.text} className="flex items-center gap-4 px-4 pt-4 first:pt-0 md:pt-0">
                  <div
                    className={`w-10 h-10 shrink-0 rounded-full ${glassBorder} flex items-center justify-center bg-white/[0.04]`}
                  >
                    <Icon d={p.icon} className="w-5 h-5 text-[#958ea0]" />
                  </div>
                  <span className="text-[#cbc3d7]">{p.text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-24" id="how-it-works">
          <div className="max-w-7xl mx-auto w-full px-4 md:px-8">
            <h2 className="text-3xl font-bold text-center mb-16">How it works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px border-t border-dashed border-white/[0.08] z-0" />
              {[
                {
                  step: "1",
                  title: "Install the daemon",
                  text: "One command starts the watch process.",
                  body: <CopyCommand short />,
                },
                {
                  step: "2",
                  title: "Code with your AI",
                  text: "Use Claude Code, Cursor or Cline as usual.",
                  body: <Icon d={icons.bot} className="w-8 h-8 text-[#958ea0]" />,
                },
                {
                  step: "3",
                  title: "Context saved",
                  text: "Decisions appear in CLAUDE.md + dashboard.",
                  body: <Icon d={icons.cpu} className="w-8 h-8 text-[#958ea0]" />,
                },
              ].map((s) => (
                <div
                  key={s.step}
                  className={`bg-white/[0.03] ${glassBorder} rounded-xl p-8 relative z-10 flex flex-col items-center`}
                >
                  <div
                    className={`w-12 h-12 bg-[#050508] ${glassBorder} rounded-full flex items-center justify-center text-[#d0bcff] font-mono mb-6`}
                  >
                    {s.step}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{s.title}</h3>
                  <p className="text-[#cbc3d7] text-center mb-6">{s.text}</p>
                  <div className="flex justify-center">{s.body}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-24 bg-white/[0.02] border-y border-white/[0.08]" id="features">
          <div className="max-w-7xl mx-auto w-full px-4 md:px-8">
            <h2 className="text-3xl font-bold text-center mb-16">Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f) => (
                <div
                  key={f.title}
                  className={`bg-[#050508] p-6 rounded-xl ${glassBorder} hover:border-[#d0bcff]/50 transition-colors`}
                >
                  <Icon d={f.icon} className="w-6 h-6 text-[#d0bcff] mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                  <p className="text-[#cbc3d7]">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Dashboard preview */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto w-full px-4 md:px-8">
            <h2 className="text-3xl font-bold text-center mb-16">Your Context Dashboard</h2>
            <div
              className={`bg-[#050508] ${glassBorder} border-t-white/[0.15] rounded-xl shadow-2xl overflow-hidden`}
            >
              <div className="bg-black/20 border-b border-white/5 px-4 py-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#494454]" />
                <div className="w-3 h-3 rounded-full bg-[#494454]" />
                <div className="w-3 h-3 rounded-full bg-[#494454]" />
                <div
                  className={`ml-4 bg-white/[0.04] text-[#958ea0] px-4 py-1 rounded text-xs font-mono ${glassBorder} w-64 text-center`}
                >
                  context.nimblabs.com
                </div>
              </div>
              <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 bg-[#111415] md:h-96">
                <div className="w-full md:w-48 flex flex-col gap-2 md:border-r border-white/[0.08] md:pr-6">
                  <div className="font-mono text-[11px] text-[#958ea0] mb-2">PROJECTS</div>
                  <div className="text-[#d0bcff] font-mono text-sm bg-[#d0bcff]/10 px-2 py-1 rounded">
                    auth-service
                  </div>
                  <div className="text-[#cbc3d7] font-mono text-sm px-2 py-1">
                    frontend-core
                  </div>
                  <div className="text-[#cbc3d7] font-mono text-sm px-2 py-1">
                    data-pipeline
                  </div>
                </div>
                <div className="flex-1 flex flex-col gap-4">
                  <div className="flex justify-between items-center mb-2 border-b border-white/[0.08] pb-4">
                    <h3 className="text-xl font-bold">auth-service</h3>
                    <span
                      className={`text-xs font-mono text-[#958ea0] bg-white/[0.04] px-2 py-1 ${glassBorder} rounded`}
                    >
                      Updated 2m ago
                    </span>
                  </div>
                  <div className={`bg-[#050508] ${glassBorder} border-l-2 border-l-[#d0bcff] p-4 rounded-lg`}>
                    <div className="font-bold mb-1">Switched to JWT with HTTP-only cookies</div>
                    <div className="text-[#cbc3d7] text-sm mb-2">
                      Decided against localStorage due to XSS vulnerabilities mentioned during
                      auth flow review.
                    </div>
                    <div className="text-xs font-mono text-[#958ea0]">Via Claude Code</div>
                  </div>
                  <div className={`bg-[#050508] ${glassBorder} p-4 rounded-lg`}>
                    <div className="font-bold mb-1">Adopted Prisma ORM</div>
                    <div className="text-[#cbc3d7] text-sm mb-2">
                      Replaced raw SQL queries for better type safety across the monorepo.
                    </div>
                    <div className="text-xs font-mono text-[#958ea0]">Via Cursor</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-24 bg-white/[0.02] border-t border-white/[0.08]" id="pricing">
          <div className="max-w-7xl mx-auto w-full px-4 md:px-8">
            <h2 className="text-3xl font-bold text-center mb-16">Pricing</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`bg-[#050508] p-8 rounded-xl flex flex-col relative ${
                    plan.highlight
                      ? "border-2 border-[#d0bcff] shadow-[0_0_20px_rgba(109,59,215,0.15)]"
                      : glassBorder
                  }`}
                >
                  {plan.badge && (
                    <div
                      className={`absolute -top-3 right-8 font-mono text-[11px] px-2 py-1 rounded ${
                        plan.highlight
                          ? "bg-[#d0bcff] text-[#3c0091]"
                          : "bg-amber-500 text-black"
                      }`}
                    >
                      {plan.badge}
                    </div>
                  )}
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <div className="text-4xl font-bold mb-6">
                    {plan.price}
                    <span className="text-base text-[#cbc3d7] font-normal">{plan.period}</span>
                  </div>
                  <ul className="text-[#cbc3d7] flex flex-col gap-4 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <Icon d={icons.check} className="w-4 h-4 shrink-0 text-[#d0bcff]" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="/api/auth/login"
                    className={`w-full py-2 rounded text-sm text-center transition-colors ${
                      plan.highlight
                        ? "bg-[#6d3bd7] hover:bg-[#7d4be7] text-white"
                        : "bg-white/[0.08] hover:bg-white/[0.15] text-[#e1e3e4]"
                    }`}
                  >
                    {plan.cta}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-32 border-t border-white/[0.08]">
          <div className="max-w-7xl mx-auto w-full px-4 md:px-8 text-center flex flex-col items-center">
            <h2 className="text-4xl font-bold tracking-tight mb-8">
              Stop re-explaining your codebase.
            </h2>
            <a href="/api/auth/login" className={`px-8 py-4 mb-8 inline-block ${ctaButton}`}>
              Start free
            </a>
            <CopyCommand />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#050508] border-t border-white/[0.08]">
        <div className="flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto px-4 md:px-8 py-8 gap-4">
          <div className="flex items-center gap-4">
            <span className="font-mono text-sm font-bold text-[#cbc3d7]">Context Keeper</span>
            <span
              className={`font-mono text-[11px] text-[#958ea0] px-2 py-1 ${glassBorder} rounded bg-white/[0.03]`}
            >
              a nimblabs product
            </span>
          </div>
          <div className="flex gap-6 font-mono text-[11px] uppercase tracking-wider text-[#cbc3d7]">
            <Link href="/blog" className="hover:text-[#d0bcff] transition-colors">
              Blog
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#d0bcff] transition-colors"
            >
              Docs
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#d0bcff] transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
