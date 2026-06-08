import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { getAllArticleSlugs, getArticleBySlug } from "@/lib/content";
import { buildArticleMetadata, buildCanonical, SITE_URL } from "@/lib/seo";
import { articleSchema, faqPageSchema, breadcrumbSchema } from "@/lib/schema";
import { JsonLd } from "@/components/blog/JsonLd";
import { Breadcrumbs } from "@/components/blog/Breadcrumbs";
import { Tldr } from "@/components/blog/Tldr";
import { Faq } from "@/components/blog/Faq";
import { AuthorBox } from "@/components/blog/AuthorBox";
import { FigureImage } from "@/components/blog/FigureImage";
import { TableOfContents } from "@/components/blog/TableOfContents";
import { RelatedArticles } from "@/components/blog/RelatedArticles";

const mdxComponents = {
  Tldr,
  Faq,
  FigureImage,
};

export async function generateStaticParams() {
  return getAllArticleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};
  return buildArticleMetadata(article);
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const crumbs = [
    { name: "Home", url: SITE_URL },
    { name: "Blog", url: buildCanonical("/blog") },
    { name: article.title, url: buildCanonical(`/blog/${article.slug}`) },
  ];

  return (
    <>
      <JsonLd
        schema={articleSchema({
          ...article,
          heroImage: {
            ...article.heroImage,
            width: article.heroImage.width ?? 1200,
            height: article.heroImage.height ?? 630,
          },
        })}
      />
      {article.faq?.length > 0 && <JsonLd schema={faqPageSchema(article.faq)} />}
      <JsonLd schema={breadcrumbSchema(crumbs)} />

      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-8 py-12">
          <Breadcrumbs crumbs={crumbs} />

          <header className="mt-6 mb-8">
            <span className="text-sm font-semibold text-indigo-600 uppercase tracking-wide">
              {article.cluster}
            </span>
            <h1 className="mt-2 text-4xl font-bold text-gray-900 leading-tight">
              {article.title}
            </h1>
            <p className="mt-4 text-xl text-gray-600">{article.description}</p>
            <p className="mt-4 text-sm text-gray-400">
              {new Date(article.datePublished).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              {article.dateModified &&
                article.dateModified !== article.datePublished && (
                  <span>
                    {" · Updated "}
                    {new Date(article.dateModified).toLocaleDateString(
                      "en-US",
                      { year: "numeric", month: "long", day: "numeric" }
                    )}
                  </span>
                )}
              {article.readingTime && ` · ${article.readingTime} min read`}
            </p>
          </header>

          <div className="relative w-full h-80 rounded-xl overflow-hidden mb-10">
            <img
              src={article.heroImage.src}
              alt={article.heroImage.alt}
              className="w-full h-full object-cover"
              width={article.heroImage.width ?? 1200}
              height={article.heroImage.height ?? 630}
            />
            {article.heroImage.credit && (
              <p className="absolute bottom-2 right-3 text-xs text-white/70 bg-black/30 px-2 py-1 rounded">
                {article.heroImage.credit}
              </p>
            )}
          </div>

          <div className="flex flex-col lg:flex-row gap-12">
            <aside className="lg:w-64 shrink-0">
              <TableOfContents content={article.content} />
            </aside>

            <article className="prose prose-lg prose-indigo max-w-none flex-1">
              <MDXRemote
                source={article.content}
                components={mdxComponents}
                options={{
                  mdxOptions: {
                    remarkPlugins: [remarkGfm],
                    rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
                  },
                }}
              />

              {article.faq?.length > 0 && (
                <Faq items={article.faq} />
              )}
            </article>
          </div>

          <AuthorBox author={article.author} />

          {article.relatedSlugs?.length > 0 && (
            <RelatedArticles slugs={article.relatedSlugs} currentSlug={article.slug} />
          )}
        </div>
      </div>
    </>
  );
}
