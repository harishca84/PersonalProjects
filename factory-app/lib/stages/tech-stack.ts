import { Job, TechStack } from '@/types/factory';
import { generate } from '@/lib/claude';

const SYSTEM = `You are the Tech Stack Selection Agent for an AI Factory.

Default recommendation for most service business SaaS platforms:
- Next.js 16 + TypeScript (full-stack, one codebase)
- Supabase (PostgreSQL + Auth + Storage + Realtime)
- Tailwind CSS (styling)
- Vercel (deployment)
- Twilio (SMS/WhatsApp if notifications needed)
- Stripe (payments if invoicing needed)

Override defaults when:
- Mobile-first is critical → React Native + Expo + Supabase
- Complex offline requirements → add PWA layer
- Heavy data processing → add Python service

Output ONLY valid JSON:
{
  "name": "string (e.g. Next.js + Supabase Stack)",
  "reason": "string",
  "components": [
    { "layer": "string", "technology": "string", "reason": "string" }
  ],
  "deployTarget": "string"
}`;

export async function selectTechStack(job: Job): Promise<TechStack> {
  const result = await generate({
    model: 'claude-sonnet-4-6',
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Select the tech stack for:

Business: ${job.businessName} (${job.businessType})
Tier: ${job.chosenTier}
Architecture overview: ${job.architecture?.overview}
Required integrations: ${job.architecture?.integrations.join(', ')}`,
      },
    ],
  });

  const match = result.content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Tech stack selection returned no JSON');
  return JSON.parse(match[0]) as TechStack;
}
