import { ChatMessage, Job } from '@/types/factory';
import { generate } from '@/lib/claude';

const SYSTEM = `You are the Discovery Agent for an AI Factory that builds SaaS platforms for service businesses.

Your goal: understand this business deeply through conversation so the factory can build them the perfect software.

Ask about:
1. Services offered and how they're priced
2. Current workflow: how do orders/jobs move from intake to completion?
3. Pain points with current (likely paper/spreadsheet) tracking
4. Customer communication: how do customers know when to pick up? Any follow-ups?
5. Volume: orders per day, staff count
6. Any seasonal patterns or special requirements
7. What "a perfect workday" looks like for them

Rules:
- Ask ONE question at a time, naturally in conversation
- Be friendly and professional
- Build on their previous answers to go deeper
- After ~10 exchanges covering all key areas, end your message with [DISCOVERY_COMPLETE]
- Don't add [DISCOVERY_COMPLETE] until you truly have enough to write a product spec`;

export function openingMessage(): string {
  return `Welcome! I'm the AI Factory's discovery agent.

I'm going to ask you a few questions about your business so we can design and build you the perfect management platform — one that fits exactly how you work.

Let's start: **What's your business name, and what type of service do you provide?**`;
}

export async function continueDiscovery(
  job: Job,
  userMessage: string
): Promise<{ response: string; isComplete: boolean }> {
  const history = job.discoveryChat.map((m) => ({ role: m.role, content: m.content }));
  history.push({ role: 'user', content: userMessage });

  const result = await generate({
    model: 'claude-sonnet-4-6',
    system: SYSTEM,
    messages: history,
  });

  const isComplete = result.content.includes('[DISCOVERY_COMPLETE]');
  const response = result.content.replace('[DISCOVERY_COMPLETE]', '').trim();
  return { response, isComplete };
}

export async function summarizeDiscovery(chat: ChatMessage[]): Promise<string> {
  const transcript = chat
    .map((m) => `${m.role === 'user' ? 'Owner' : 'Factory'}: ${m.content}`)
    .join('\n\n');

  const result = await generate({
    model: 'claude-sonnet-4-6',
    system: 'You extract structured business intelligence from discovery conversations for a software factory.',
    messages: [
      {
        role: 'user',
        content: `Summarize the key business intelligence from this discovery conversation. Include:
- Business type and services
- Current workflow (step by step)
- Pain points and inefficiencies
- Customer communication needs
- Order/job volume and staffing
- Key requirements for the software

Conversation:
${transcript}`,
      },
    ],
  });

  return result.content;
}
