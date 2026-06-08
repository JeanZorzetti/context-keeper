import type { AIProvider, ProviderConfig } from './types.js';

const DEFAULT_MODEL = 'gpt-4o-mini';
const API_URL = 'https://api.openai.com/v1/chat/completions';

export class OpenAIProvider implements AIProvider {
  readonly id = 'openai' as const;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(config: ProviderConfig) {
    if (!config.apiKey) throw new Error('OpenAI provider requires an API key');
    this.apiKey = config.apiKey;
    this.model = config.model ?? DEFAULT_MODEL;
  }

  async complete(systemPrompt: string, transcript: string): Promise<string> {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Transcript:\n\n${transcript}` },
        ],
        temperature: 0.1,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) throw new Error(`OpenAI API error: HTTP ${res.status}`);
    const json = await res.json() as { choices: Array<{ message: { content: string } }> };
    return json.choices[0]?.message?.content ?? '{}';
  }
}
