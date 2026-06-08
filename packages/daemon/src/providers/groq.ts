import Groq from 'groq-sdk';
import type { AIProvider, ProviderConfig } from './types.js';

const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

export class GroqProvider implements AIProvider {
  readonly id = 'groq' as const;
  private readonly groq: Groq;
  private readonly model: string;

  constructor(config: ProviderConfig) {
    this.groq = new Groq({ apiKey: config.apiKey });
    this.model = config.model ?? DEFAULT_MODEL;
  }

  async complete(systemPrompt: string, transcript: string): Promise<string> {
    const completion = await this.groq.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Transcript:\n\n${transcript}` },
      ],
      temperature: 0.1,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    });
    return completion.choices[0]?.message?.content ?? '{}';
  }
}
