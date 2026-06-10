import type { ProviderConfig, ProviderId } from './providers/types.js';

// TTL so provider changes in the dashboard reach a running daemon without restart
const CACHE_TTL_MS = 5 * 60 * 1000;

let cached: ProviderConfig | undefined;
let cachedAt = 0;

/**
 * Resolves the AI provider configuration.
 *
 * Resolution order:
 * 1. CONTEXT_KEEPER_PROVIDER env var — explicit local override, no account needed
 * 2. Dashboard config (CONTEXT_KEEPER_API_URL + CONTEXT_KEEPER_TOKEN)
 * 3. Provider API keys found in the environment (GROQ_API_KEY, OPENAI_API_KEY,
 *    ANTHROPIC_API_KEY, GEMINI_API_KEY, OLLAMA_BASE_URL)
 *
 * (2) and (3) make the daemon fully functional offline / without signup.
 */
export async function fetchProviderConfig(): Promise<ProviderConfig | null> {
  if (cached && Date.now() - cachedAt < CACHE_TTL_MS) return cached;

  const explicit = explicitEnvConfig();
  if (explicit) return setCache(explicit);

  const remote = await fetchRemoteConfig();
  if (remote) return setCache(remote);

  const local = envKeyConfig();
  if (local) return setCache(local);

  return null;
}

function setCache(config: ProviderConfig): ProviderConfig {
  cached = config;
  cachedAt = Date.now();
  return config;
}

async function fetchRemoteConfig(): Promise<ProviderConfig | null> {
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
    return {
      provider: (j.provider as ProviderId) ?? 'groq',
      apiKey: j.apiKey ?? undefined,
      model: j.model ?? undefined,
      baseUrl: j.baseUrl ?? undefined,
    };
  } catch {
    return null;
  }
}

const ENV_KEY_BY_PROVIDER: Array<[ProviderId, string]> = [
  ['groq', 'GROQ_API_KEY'],
  ['openai', 'OPENAI_API_KEY'],
  ['anthropic', 'ANTHROPIC_API_KEY'],
  ['gemini', 'GEMINI_API_KEY'],
];

function explicitEnvConfig(): ProviderConfig | null {
  const provider = process.env.CONTEXT_KEEPER_PROVIDER as ProviderId | undefined;
  if (!provider) return null;

  const model = process.env.CONTEXT_KEEPER_MODEL || undefined;

  if (provider === 'ollama') {
    return {
      provider,
      model,
      baseUrl: process.env.OLLAMA_BASE_URL || undefined,
    };
  }

  const envKey = ENV_KEY_BY_PROVIDER.find(([p]) => p === provider)?.[1];
  const apiKey = envKey ? process.env[envKey] : undefined;
  if (!apiKey) {
    console.warn(`[config] CONTEXT_KEEPER_PROVIDER=${provider} set but ${envKey ?? 'its API key'} is missing`);
    return null;
  }

  return { provider, apiKey, model };
}

function envKeyConfig(): ProviderConfig | null {
  const model = process.env.CONTEXT_KEEPER_MODEL || undefined;

  for (const [provider, envKey] of ENV_KEY_BY_PROVIDER) {
    const apiKey = process.env[envKey];
    if (apiKey) return { provider, apiKey, model };
  }

  if (process.env.OLLAMA_BASE_URL) {
    return { provider: 'ollama', model, baseUrl: process.env.OLLAMA_BASE_URL };
  }

  return null;
}

export function resetConfigCache(): void {
  cached = undefined;
  cachedAt = 0;
}
