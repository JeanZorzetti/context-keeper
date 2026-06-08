import Link from "next/link";

interface Crumb {
  name: string;
  url: string;
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-gray-500">
        {crumbs.map((crumb, i) => (
          <li key={crumb.url} className="flex items-center gap-1">
            {i < crumbs.length - 1 ? (
              <>
                <Link href={crumb.url} className="hover:text-indigo-600 transition">
                  {crumb.name}
                </Link>
                <span aria-hidden="true">›</span>
              </>
            ) : (
              <span className="text-gray-700 font-medium" aria-current="page">
                {crumb.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
