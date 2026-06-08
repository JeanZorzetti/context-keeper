import type { AIProvider, ProviderConfig } from './types.js';
import { GroqProvider } from './groq.js';
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { GeminiProvider } from './gemini.js';
import { OllamaProvider } from './ollama.js';

export function createProvider(config: ProviderConfig): AIProvider {
  switch (config.provider) {
    case 'groq':      return new GroqProvider(config);
    case 'openai':    return new OpenAIProvider(config);
    case 'anthropic': return new AnthropicProvider(config);
    case 'gemini':    return new GeminiProvider(config);
    case 'ollama':    return new OllamaProvider(config);
    default:
      throw new Error(`Unknown provider: ${(config as ProviderConfig).provider}`);
  }
}
