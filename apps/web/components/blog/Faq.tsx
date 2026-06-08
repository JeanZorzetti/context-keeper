"use client";

import { useState } from "react";

interface FaqItem {
  q: string;
  a: string;
}

export function Faq({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);

  if (!items || items.length === 0) return null;

  return (
    <section className="mt-16 pt-8 border-t border-gray-200">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Frequently Asked Questions
      </h2>
      <dl className="space-y-4">
        {items.map((item, i) => (
          <div
            key={i}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            <dt>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex justify-between items-center px-6 py-4 text-left font-semibold text-gray-900 hover:bg-gray-50 transition"
                aria-expanded={open === i}
              >
                <span>{item.q}</span>
                <span className="ml-4 text-indigo-500 text-xl leading-none">
                  {open === i ? "−" : "+"}
                </span>
              </button>
            </dt>
            {open === i && (
              <dd className="px-6 py-4 bg-gray-50 text-gray-700 leading-relaxed border-t border-gray-100">
                {item.a}
              </dd>
            )}
          </div>
        ))}
      </dl>
    </section>
  );
}
