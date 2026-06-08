import fs from "fs";
import path from "path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "content", "blog");

export interface ArticleFrontmatter {
  title: string;
  slug: string;
  description: string;
  cluster: string;
  keywords: string[];
  primaryKeyword: string;
  author: string;
  datePublished: string;
  dateModified?: string;
  readingTime?: number;
  heroImage: {
    src: string;
    alt: string;
    width: number;
    height: number;
    credit: string;
    searchTerm: string;
  };
  faq: Array<{ q: string; a: string }>;
  relatedSlugs: string[];
  canonical?: string;
  draft?: boolean;
}

export interface Article extends ArticleFrontmatter {
  content: string;
}

function ensureContentDir() {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".mdx"));
}

export function getAllArticleSlugs(): string[] {
  return ensureContentDir().map((f) => f.replace(/\.mdx$/, ""));
}

export function getAllArticles(): ArticleFrontmatter[] {
  const files = ensureContentDir();
  return files
    .map((filename) => {
      const raw = fs.readFileSync(path.join(CONTENT_DIR, filename), "utf-8");
      const { data } = matter(raw);
      return data as ArticleFrontmatter;
    })
    .filter((a) => !a.draft)
    .sort(
      (a, b) =>
        new Date(b.datePublished).getTime() -
        new Date(a.datePublished).getTime()
    );
}

export function getArticleBySlug(slug: string): Article | null {
  const filepath = path.join(CONTENT_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filepath)) return null;
  const raw = fs.readFileSync(filepath, "utf-8");
  const { data, content } = matter(raw);
  return { ...(data as ArticleFrontmatter), content };
}

export function getArticlesByCluster(cluster: string): ArticleFrontmatter[] {
  return getAllArticles().filter((a) => a.cluster === cluster);
}
