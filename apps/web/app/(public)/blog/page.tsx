import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getAllArticles } from "@/lib/content";
import { buildCanonical, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Blog — AI Coding Agents, Context Management & Claude Code",
  description:
    "Guides, comparisons, and deep-dives on AI coding agents, Claude Code, Cursor, context management, and architectural decision tracking.",
  alternates: { canonical: buildCanonical("/blog") },
  openGraph: {
    type: "website",
    title: "Blog — AI Coding Agents, Context Management & Claude Code",
    description:
      "Guides, comparisons, and deep-dives on AI coding agents, Claude Code, Cursor, context management, and architectural decision tracking.",
    url: buildCanonical("/blog"),
  },
};

const CLUSTERS = [
  "Context Rot & AI Agent Memory",
  "Claude Code",
  "AI Coding Tools & Comparisons",
  "Vibe Coding & Workflows",
  "Teams & Architecture Docs",
  "MCP & Technical Deep-Dives",
];

export default async function BlogIndex() {
  const articles = getAllArticles();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-8 py-16">
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {SITE_NAME} Blog
          </h1>
          <p className="text-xl text-gray-600">
            Guides, comparisons, and deep-dives on AI coding agents, Claude
            Code, context management, and developer productivity.
          </p>
        </header>

        {articles.length === 0 ? (
          <p className="text-gray-500">Articles coming soon.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article) => (
              <Link
                key={article.slug}
                href={`/blog/${article.slug}`}
                className="group bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden"
              >
                <div className="relative w-full h-48">
                  <Image
                    src={article.heroImage.src}
                    alt={article.heroImage.alt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
                <div className="p-5">
                  <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                    {article.cluster}
                  </span>
                  <h2 className="mt-2 text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition">
                    {article.title}
                  </h2>
                  <p className="mt-2 text-sm text-gray-600 line-clamp-3">
                    {article.description}
                  </p>
                  <p className="mt-3 text-xs text-gray-400">
                    {new Date(article.datePublished).toLocaleDateString(
                      "en-US",
                      { year: "numeric", month: "long", day: "numeric" }
                    )}
                    {article.readingTime && ` · ${article.readingTime} min read`}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
