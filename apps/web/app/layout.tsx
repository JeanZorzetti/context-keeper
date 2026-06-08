import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SITE_URL, DEFAULT_OG_IMAGE } from "@/lib/seo";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Context Keeper — Context Lifecycle Manager for AI Coding Agents",
    template: "%s | Context Keeper",
  },
  description:
    "Context Keeper automatically captures architectural decisions from your Claude Code, Cursor, and Cline sessions. Never lose context between AI agent sessions again.",
  keywords: [
    "context keeper",
    "ai coding agents",
    "claude code",
    "context rot",
    "architectural decisions",
    "CLAUDE.md",
    "MCP server",
    "ai agent memory",
  ],
  authors: [{ name: "Context Keeper", url: SITE_URL }],
  creator: "Context Keeper",
  publisher: "Context Keeper",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Context Keeper",
    title: "Context Keeper — Context Lifecycle Manager for AI Coding Agents",
    description:
      "Automatically capture architectural decisions from your AI coding sessions. Keep your CLAUDE.md current and boot agents with full context.",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Context Keeper — Context Lifecycle Manager for AI Coding Agents",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Context Keeper — Context Lifecycle Manager for AI Coding Agents",
    description:
      "Automatically capture architectural decisions from your AI coding sessions. Keep your CLAUDE.md current.",
    images: [DEFAULT_OG_IMAGE],
    creator: "@contextkeeper",
  },
  alternates: {
    canonical: SITE_URL,
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
