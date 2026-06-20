import { Job, PRD } from '@/types/factory';
import { generate } from '@/lib/claude';

const SYSTEM = `You are the PRD Agent for an AI Factory. Generate a Product Requirements Document as valid JSON.

You always produce 3 tiers:
- Starter ($49-79/mo): Core digital operations only. Order tracking + basic invoicing. No frills, just "get off paper."
- Standard ($89-129/mo): Core + SMS/WhatsApp customer notifications + analytics dashboard. The most popular choice.
- Pro ($149-249/mo): Everything in Standard + advanced analytics + multi-location + API access + custom branding.

Pricing should reflect the business size and market (small local business vs. multi-location chain).

Output ONLY valid JSON matching this schema exactly:
{
  "executiveSummary": "string",
  "businessContext": "string",
  "personas": [
    { "name": "string", "role": "string", "needs": ["string"] }
  ],
  "tiers": {
    "starter": {
      "name": "Starter",
      "price": "string (e.g. $59/month)",
      "description": "string",
      "features": ["string"],
      "recommended": false
    },
    "standard": {
      "name": "Standard",
      "price": "string",
      "description": "string",
      "features": ["string"],
      "recommended": true
    },
    "pro": {
      "name": "Pro",
      "price": "string",
      "description": "string",
      "features": ["string"],
      "recommended": false
    }
  },
  "successMetrics": ["string"]
}`;

export async function generatePRD(job: Job): Promise<PRD> {
  const result = await generate({
    model: 'claude-opus-4-8',
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Generate a PRD for this service business.

Business Name: ${job.businessName}
Business Type: ${job.businessType}

Discovery Summary:
${job.discoverySummary}`,
      },
    ],
    maxTokens: 8192,
  });

  const match = result.content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('PRD generation returned no JSON');
  return JSON.parse(match[0]) as PRD;
}
