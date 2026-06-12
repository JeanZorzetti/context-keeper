"use client";

import { useState } from "react";

const COMMAND = "npx @jeanzorzetti/context-keeper start";

export default function CopyCommand({ short = false }: { short?: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable (e.g. non-secure context) — ignore
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="group relative flex items-center bg-[#050508] border border-white/[0.08] rounded overflow-hidden cursor-pointer hover:border-[#d0bcff]/50 transition-colors text-left"
      aria-label="Copy install command"
    >
      <div className="px-4 py-3 font-mono text-sm text-[#cbc3d7] whitespace-nowrap">
        <span className="text-[#958ea0]">~$</span>{" "}
        {short ? "npx context-keeper start" : COMMAND}
      </div>
      <div className="px-3 py-3 self-stretch flex items-center border-l border-white/[0.08] bg-white/[0.03] group-hover:bg-[#d0bcff]/10 transition-colors">
        {copied ? (
          <svg
            className="w-[18px] h-[18px] text-[#d0bcff]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : (
          <svg
            className="w-[18px] h-[18px] text-[#cbc3d7]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </div>
    </button>
  );
}
