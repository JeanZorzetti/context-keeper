import type { AIProvider, ProviderConfig } from './types.js';

const DEFAULT_MODEL = 'llama3.1';
const DEFAULT_BASE_URL = 'http://localhost:11434';

export class OllamaProvider implements AIProvider {
  readonly id = 'ollama' as const;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(config: ProviderConfig) {
    this.model = config.model ?? DEFAULT_MODEL;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  }

  async complete(systemPrompt: string, transcript: string): Promise<string> {
    const url = `${this.baseUrl}/api/chat`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        format: 'json',
        stream: false,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Transcript:\n\n${transcript}` },
        ],
        options: { temperature: 0.1, num_predict: 1024 },
      }),
    });
    if (!res.ok) throw new Error(`Ollama API error: HTTP ${res.status}`);
    const json = await res.json() as { message: { content: string } };
    return json.message?.content ?? '{}';
  }
}
