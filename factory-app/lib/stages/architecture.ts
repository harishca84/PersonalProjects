import { Job, Architecture } from '@/types/factory';
import { generate } from '@/lib/claude';

const SYSTEM = `You are the Architecture Agent for an AI Factory. Design the technical architecture for a multi-tenant SaaS platform.

Rules:
- Multi-tenant first: every data model must include tenant_id
- Keep it practical: this is for a small service business, not a FAANG product
- Design for the chosen tier's feature set only — don't overengineer
- Be specific with technology names

Output ONLY valid JSON:
{
  "overview": "string",
  "components": [
    { "name": "string", "purpose": "string", "technology": "string" }
  ],
  "dataModels": [
    { "name": "string", "fields": ["field_name: type (description)"] }
  ],
  "apiEndpoints": [
    { "method": "GET|POST|PUT|DELETE", "path": "/api/string", "purpose": "string" }
  ],
  "integrations": ["string"],
  "deploymentTarget": "string"
}`;

export async function generateArchitecture(job: Job): Promise<Architecture> {
  const tier = job.chosenTier ?? 'standard';
  const tierData = job.prd?.tiers[tier];

  const result = await generate({
    model: 'claude-opus-4-8',
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Design the architecture for:

Business: ${job.businessName} (${job.businessType})
Tier: ${tier.toUpperCase()} — ${tierData?.name}
Features to implement: ${tierData?.features.join(', ')}

Business Context: ${job.prd?.businessContext}

Generate a production-ready architecture for a multi-tenant SaaS.`,
      },
    ],
    maxTokens: 8192,
  });

  const match = result.content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Architecture generation returned no JSON');
  return JSON.parse(match[0]) as Architecture;
}
