export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://contextkeeper.dev";

export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

export const SITE_NAME = "Context Keeper";
export const SITE_DESCRIPTION =
  "Context Lifecycle Manager for AI Coding Agents. Automatically capture architectural decisions from Claude Code, Cursor, and Cline sessions.";

export const TWITTER_HANDLE = "@contextkeeper";

export function buildCanonical(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildArticleMetadata(article: {
  title: string;
  description: string;
  slug: string;
  datePublished: string;
  dateModified?: string;
  heroImage: { src: string; alt: string };
  keywords: string[];
  author?: string;
}) {
  const url = buildCanonical(`/blog/${article.slug}`);
  return {
    title: article.title,
    description: article.description,
    keywords: article.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "article" as const,
      url,
      title: article.title,
      description: article.description,
      publishedTime: article.datePublished,
      modifiedTime: article.dateModified ?? article.datePublished,
      authors: [article.author ?? SITE_NAME],
      images: [
        {
          url: article.heroImage.src,
          width: 1200,
          height: 630,
          alt: article.heroImage.alt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: article.title,
      description: article.description,
      images: [article.heroImage.src],
    },
  };
}
