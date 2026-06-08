import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, ProviderConfig } from './types.js';

const DEFAULT_MODEL = 'claude-haiku-4-5';

export class AnthropicProvider implements AIProvider {
  readonly id = 'anthropic' as const;
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(config: ProviderConfig) {
    if (!config.apiKey) throw new Error('Anthropic provider requires an API key');
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model ?? DEFAULT_MODEL;
  }

  async complete(systemPrompt: string, transcript: string): Promise<string> {
    const msg = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Transcript:\n\n${transcript}` }],
    });
    const block = msg.content[0];
    return block?.type === 'text' ? block.text : '{}';
  }
}
