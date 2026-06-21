import { GoogleGenerativeAI } from '@google/generative-ai';

export type Model =
  | 'claude-opus-4-8'
  | 'claude-sonnet-4-6'
  | 'claude-haiku-4-5-20251001';

// All Claude model names map to Gemini equivalents:
// Opus (deep reasoning) → gemini-1.5-pro
// Sonnet (balanced)     → gemini-1.5-flash
// Haiku (fast/cheap)    → gemini-1.5-flash-8b
function toGeminiModel(model: Model): string {
  if (model === 'claude-opus-4-8') return 'gemini-1.5-pro';
  if (model === 'claude-haiku-4-5-20251001') return 'gemini-1.5-flash-8b';
  return 'gemini-1.5-flash';
}

let _client: GoogleGenerativeAI | null = null;
function client() {
  if (!_client) _client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  return _client;
}

export async function generate(options: {
  model: Model;
  system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  maxTokens?: number;
}): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  const geminiModel = client().getGenerativeModel({
    model: toGeminiModel(options.model),
    systemInstruction: options.system,
  });

  // Gemini requires history to start with 'user' role — skip any leading assistant messages
  const allPrior = options.messages.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
    parts: [{ text: m.content }],
  }));
  const firstUserIdx = allPrior.findIndex((m) => m.role === 'user');
  const history = firstUserIdx >= 0 ? allPrior.slice(firstUserIdx) : [];

  const lastMessage = options.messages[options.messages.length - 1];

  const chat = geminiModel.startChat({
    history,
    generationConfig: { maxOutputTokens: options.maxTokens ?? 8192 },
  });

  const result = await chat.sendMessage(lastMessage.content);
  const content = result.response.text();
  const usage = result.response.usageMetadata;

  return {
    content,
    inputTokens: usage?.promptTokenCount ?? 0,
    outputTokens: usage?.candidatesTokenCount ?? 0,
  };
}
