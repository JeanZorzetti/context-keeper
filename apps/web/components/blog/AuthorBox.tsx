import { SITE_NAME } from "@/lib/seo";

interface AuthorBoxProps {
  author?: string;
}

export function AuthorBox({ author }: AuthorBoxProps) {
  const name = author ?? SITE_NAME;

  return (
    <div className="mt-16 pt-8 border-t border-gray-200 flex items-start gap-4">
      <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl shrink-0">
        {name.charAt(0)}
      </div>
      <div>
        <p className="font-semibold text-gray-900">{name}</p>
        <p className="text-sm text-gray-600 mt-1">
          The {SITE_NAME} team builds tools that keep AI coding agents
          productive. We write about AI agent workflows, context management, and
          developer productivity from first-hand experience.
        </p>
      </div>
    </div>
  );
}
