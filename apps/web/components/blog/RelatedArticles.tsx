import Link from "next/link";
import Image from "next/image";
import { getArticleBySlug } from "@/lib/content";

interface RelatedArticlesProps {
  slugs: string[];
  currentSlug: string;
}

export function RelatedArticles({ slugs, currentSlug }: RelatedArticlesProps) {
  const related = slugs
    .filter((s) => s !== currentSlug)
    .map((s) => getArticleBySlug(s))
    .filter(Boolean)
    .slice(0, 3);

  if (related.length === 0) return null;

  return (
    <section className="mt-16 pt-8 border-t border-gray-200">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Articles</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {related.map((article) => (
          <Link
            key={article!.slug}
            href={`/blog/${article!.slug}`}
            className="group border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition"
          >
            <div className="relative w-full h-36">
              <Image
                src={article!.heroImage.src}
                alt={article!.heroImage.alt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <div className="p-4">
              <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition line-clamp-2">
                {article!.title}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {article!.readingTime} min read
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
