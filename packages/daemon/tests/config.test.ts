import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchProviderConfig, resetConfigCache } from '../src/config.js';

const ENV_KEYS = [
  'CONTEXT_KEEPER_API_URL',
  'CONTEXT_KEEPER_TOKEN',
  'CONTEXT_KEEPER_PROVIDER',
  'CONTEXT_KEEPER_MODEL',
  'GROQ_API_KEY',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GEMINI_API_KEY',
  'OLLAMA_BASE_URL',
];

const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  resetConfigCache();
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  vi.restoreAllMocks();
});

describe('fetchProviderConfig — local-first mode', () => {
  it('returns null when nothing is configured', async () => {
    expect(await fetchProviderConfig()).toBeNull();
  });

  it('falls back to GROQ_API_KEY without any dashboard credentials', async () => {
    process.env.GROQ_API_KEY = 'gsk_local';
    const config = await fetchProviderConfig();
    expect(config).toEqual({ provider: 'groq', apiKey: 'gsk_local', model: undefined });
  });

  it('falls back to OLLAMA_BASE_URL for fully offline mode', async () => {
    process.env.OLLAMA_BASE_URL = 'http://localhost:11434';
    const config = await fetchProviderConfig();
    expect(config?.provider).toBe('ollama');
    expect(config?.baseUrl).toBe('http://localhost:11434');
  });

  it('CONTEXT_KEEPER_PROVIDER explicitly overrides dashboard config', async () => {
    process.env.CONTEXT_KEEPER_API_URL = 'https://example.com';
    process.env.CONTEXT_KEEPER_TOKEN = 'tok';
    process.env.CONTEXT_KEEPER_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'sk_local';
    process.env.CONTEXT_KEEPER_MODEL = 'gpt-4o-mini';

    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const config = await fetchProviderConfig();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(config).toEqual({ provider: 'openai', apiKey: 'sk_local', model: 'gpt-4o-mini' });
  });

  it('returns null when explicit provider lacks its API key', async () => {
    process.env.CONTEXT_KEEPER_PROVIDER = 'anthropic';
    expect(await fetchProviderConfig()).toBeNull();
  });

  it('uses dashboard config when available and no explicit override', async () => {
    process.env.CONTEXT_KEEPER_API_URL = 'https://example.com';
    process.env.CONTEXT_KEEPER_TOKEN = 'tok';

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ provider: 'groq', apiKey: 'gsk_remote' }), { status: 200 }),
    );

    const config = await fetchProviderConfig();
    expect(config?.apiKey).toBe('gsk_remote');
  });

  it('falls back to env keys when the dashboard is unreachable', async () => {
    process.env.CONTEXT_KEEPER_API_URL = 'https://example.com';
    process.env.CONTEXT_KEEPER_TOKEN = 'tok';
    process.env.GROQ_API_KEY = 'gsk_fallback';

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

    const config = await fetchProviderConfig();
    expect(config).toEqual({ provider: 'groq', apiKey: 'gsk_fallback', model: undefined });
  });
});
