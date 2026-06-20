import Anthropic from '@anthropic-ai/sdk';

export type Model =
  | 'claude-opus-4-8'
  | 'claude-sonnet-4-6'
  | 'claude-haiku-4-5-20251001';

let _client: Anthropic | null = null;
function client() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

export async function generate(options: {
  model: Model;
  system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  maxTokens?: number;
}): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  const response = await client().messages.create({
    model: options.model,
    max_tokens: options.maxTokens ?? 8192,
    system: options.system,
    messages: options.messages,
  });

  const content = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  return {
    content,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}
