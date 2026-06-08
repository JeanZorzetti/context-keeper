"use client";

interface Heading {
  id: string;
  text: string;
  level: number;
}

function extractHeadings(content: string): Heading[] {
  const lines = content.split("\n");
  const headings: Heading[] = [];
  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)/);
    if (match) {
      const text = match[2].trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");
      headings.push({ id, text, level: match[1].length });
    }
  }
  return headings;
}

export function TableOfContents({ content }: { content: string }) {
  const headings = extractHeadings(content);
  if (headings.length < 3) return null;

  return (
    <nav className="sticky top-8 bg-gray-50 rounded-lg p-5 text-sm">
      <p className="font-semibold text-gray-900 mb-3">Table of Contents</p>
      <ol className="space-y-2">
        {headings.map((h) => (
          <li
            key={h.id}
            className={h.level === 3 ? "pl-4" : ""}
          >
            <a
              href={`#${h.id}`}
              className="text-gray-600 hover:text-indigo-600 transition leading-snug block"
            >
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
