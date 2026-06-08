export function parseDecisions(raw: string): string[] {
  // Strip markdown fences if present (defensive, for providers that ignore JSON-mode)
  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

  try {
    const parsed = JSON.parse(stripped);
    const arr: unknown = Array.isArray(parsed)
      ? parsed
      : parsed.decisions ?? Object.values(parsed).find((v) => Array.isArray(v));
    if (Array.isArray(arr)) {
      return (arr as unknown[])
        .filter((item): item is string => typeof item === 'string')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 10);
    }
  } catch {
    // unexpected output — return empty
  }

  return [];
}
