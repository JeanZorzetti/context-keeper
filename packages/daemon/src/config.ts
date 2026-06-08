import type { ProviderConfig } from './providers/types.js';

let cached: ProviderConfig | undefined;

export async function fetchProviderConfig(): Promise<ProviderConfig | null> {
  if (cached) return cached;

  const apiUrl = process.env.CONTEXT_KEEPER_API_URL;
  const token = process.env.CONTEXT_KEEPER_TOKEN;

  if (!apiUrl || !token) return null;

  try {
    const res = await fetch(`${apiUrl}/api/daemon/config`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const j = await res.json() as {
      provider?: string;
      apiKey?: string;
      model?: string;
      baseUrl?: string;
    };
    cached = {
      provider: (j.provider as ProviderConfig['provider']) ?? 'groq',
      apiKey: j.apiKey ?? undefined,
      model: j.model ?? undefined,
      baseUrl: j.baseUrl ?? undefined,
    };
    return cached;
  } catch {
    return null;
  }
}

export function resetConfigCache(): void {
  cached = undefined;
}
