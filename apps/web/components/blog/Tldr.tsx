"use client";

export function Tldr({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-8 p-6 bg-indigo-50 border-l-4 border-indigo-500 rounded-r-lg">
      <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">
        TL;DR — Key Takeaways
      </p>
      <div className="text-gray-800 space-y-2 text-base leading-relaxed">
        {children}
      </div>
    </div>
  );
}
