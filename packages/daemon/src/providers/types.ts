export type ProviderId = 'groq' | 'openai' | 'anthropic' | 'gemini' | 'ollama';

export interface ProviderConfig {
  provider: ProviderId;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export interface AIProvider {
  readonly id: ProviderId;
  complete(systemPrompt: string, transcript: string): Promise<string>;
}
