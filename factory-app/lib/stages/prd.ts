import { Job, PRD } from '@/types/factory';
import { generate } from '@/lib/claude';
import { getVertical } from '@/lib/verticals';

const BASE_SYSTEM = `You are the PRD Agent for an AI Factory. Generate a Product Requirements Document as valid JSON.

You always produce 3 tiers:
- Starter ($49-79/mo): Core digital operations only. Order tracking + basic invoicing. "Get off paper."
- Standard ($89-129/mo): Core + SMS/WhatsApp notifications + analytics dashboard. Most popular.
- Pro ($149-249/mo): Everything in Standard + advanced analytics + multi-location + API access + custom branding.

Pricing should reflect the business size and market.

IMPORTANT: Use the business's own terminology throughout all feature descriptions. If it's a dry cleaner, say "tickets" not "orders", "garments" not "items". If it's a tailor, say "alterations" and "clients". Match the industry vocabulary precisely.

Output ONLY valid JSON:
{
  "executiveSummary": "string",
  "businessContext": "string",
  "personas": [{ "name": "string", "role": "string", "needs": ["string"] }],
  "tiers": {
    "starter": { "name": "Starter", "price": "string", "description": "string", "features": ["string"], "recommended": false },
    "standard": { "name": "Standard", "price": "string", "description": "string", "features": ["string"], "recommended": true },
    "pro": { "name": "Pro", "price": "string", "description": "string", "features": ["string"], "recommended": false }
  },
  "successMetrics": ["string"]
}`;

export async function generatePRD(job: Job): Promise<PRD> {
  const vertical = job.wizardData?.vertical ? getVertical(job.wizardData.vertical) : null;

  const verticalContext = vertical
    ? `
Vertical: ${vertical.name}
Terminology: use "${vertical.terminology.order}" not "order", "${vertical.terminology.item}" not "item", "${vertical.terminology.customer}" not "customer", "${vertical.terminology.staff}" not "staff"
Workflow stages: ${vertical.workflowStages.map((s) => s.label).join(' → ')}
Pre-configured services: ${vertical.defaultServices.slice(0, 5).map((s) => `${s.name} ($${s.basePrice})`).join(', ')}
Key pain points to address: ${vertical.painPoints.join('; ')}
`
    : '';

  const wizardContext = job.wizardData
    ? `Staff size: ${job.wizardData.staffCount}
Daily volume: ${job.wizardData.dailyVolume}
${job.wizardData.location ? `Location: ${job.wizardData.location}` : ''}
${job.wizardData.specialNotes ? `Special requirements: ${job.wizardData.specialNotes}` : ''}`
    : '';

  const result = await generate({
    model: 'claude-opus-4-8',
    system: BASE_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Generate a PRD for this service business.

Business Name: ${job.businessName}
Business Type: ${job.businessType}
${verticalContext}
${wizardContext}

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
