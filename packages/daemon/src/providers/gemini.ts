import type { AIProvider, ProviderConfig } from './types.js';

const DEFAULT_MODEL = 'gemini-2.0-flash';

export class GeminiProvider implements AIProvider {
  readonly id = 'gemini' as const;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(config: ProviderConfig) {
    if (!config.apiKey) throw new Error('Gemini provider requires an API key');
    this.apiKey = config.apiKey;
    this.model = config.model ?? DEFAULT_MODEL;
  }

  async complete(systemPrompt: string, transcript: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: `Transcript:\n\n${transcript}` }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
          maxOutputTokens: 1024,
        },
      }),
    });
    if (!res.ok) throw new Error(`Gemini API error: HTTP ${res.status}`);
    const json = await res.json() as {
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    };
    return json.candidates[0]?.content?.parts[0]?.text ?? '{}';
  }
}
