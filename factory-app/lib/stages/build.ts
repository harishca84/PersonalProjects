import { Job, BuildOutput, GeneratedFile } from '@/types/factory';
import { generate } from '@/lib/claude';
import { getVertical } from '@/lib/verticals';
import { getTheme } from '@/lib/themes';

const BASE_SYSTEM = `You are the Build Agent for an AI Factory. Generate production-ready code for a service business SaaS.

Output format — use this EXACT format for each file:

===FILE: path/to/file.ts===
// full file content here
===END===

REQUIRED files — always generate these first:
1. package.json (all dependencies — MANDATORY)
2. next.config.ts
3. tailwind.config.ts
4. tsconfig.json
5. .env.example
6. schema.sql (database schema)
7. types/index.ts
8. Core API routes (CRUD for the main entity)
9. app/dashboard/page.tsx (main dashboard)
10. Intake / order creation form

Rules:
- Real working code only, no placeholders
- Multi-tenant: all queries scoped by tenant_id
- Next.js 15 App Router (params is async Promise)
- TypeScript throughout
- Tailwind CSS for all styling
- Supabase for DB/auth
- Pre-populate with sample data in seed.sql
- package.json must include: next, react, react-dom, @supabase/supabase-js, typescript, tailwindcss, @types/react, @types/node`;

function parseFiles(raw: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const regex = /===FILE: (.+?)===\n([\s\S]*?)===END===/g;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    files.push({ path: match[1].trim(), content: match[2].trim(), description: '' });
  }
  return files;
}

export async function buildProduct(job: Job): Promise<BuildOutput> {
  const tier = job.chosenTier ?? 'standard';
  const tierData = job.prd?.tiers[tier];
  const stackComponents = job.techStack?.components
    .map((c) => `${c.layer}: ${c.technology}`)
    .join(', ');

  const vertical = job.wizardData?.vertical ? getVertical(job.wizardData.vertical) : null;
  const theme = getTheme(job.wizardData?.theme ?? 'dark_pro');

  const vocabularyContext = vertical
    ? `Domain vocabulary (use these exact words in all UI labels, copy, and code):
- "${vertical.terminology.order}" (not "order")
- "${vertical.terminology.item}" (not "item")
- "${vertical.terminology.customer}" (not "customer")
- "${vertical.terminology.staff}" (not "staff")
- "${vertical.terminology.ready}" for the completed status
- "${vertical.terminology.intake}" for the creation action
Workflow stages: ${vertical.workflowStages.map((s) => s.label).join(' → ')}
`
    : '';

  const themeContext = `Design theme: ${theme.name}
${theme.cssContext}
Apply this theme consistently across all pages and components.
`;

  const sampleDataContext = vertical?.sampleCustomers.length
    ? `Pre-populate seed.sql with these sample ${vertical.terminology.customers}:
${vertical.sampleCustomers.map((c) => `  - ${c.name} | ${c.phone} | ${c.email} | Notes: ${c.notes}`).join('\n')}

Pre-populate sample services with pricing:
${vertical.defaultServices.slice(0, 6).map((s) => `  - ${s.name}: $${s.basePrice}`).join('\n')}
`
    : '';

  const result = await generate({
    model: 'claude-sonnet-4-6',
    system: BASE_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Build the ${tierData?.name} platform for ${job.businessName} (${job.businessType}).

Stack: ${job.techStack?.name}
Components: ${stackComponents}

${themeContext}
${vocabularyContext}
Features to implement:
${tierData?.features.map((f) => `- ${f}`).join('\n')}

Data models:
${job.architecture?.dataModels.map((m) => `${m.name}: ${m.fields.join(', ')}`).join('\n')}

API endpoints:
${job.architecture?.apiEndpoints.map((e) => `${e.method} ${e.path}: ${e.purpose}`).join('\n')}

${sampleDataContext}

Generate the core files. Use the exact domain vocabulary and theme throughout. Pre-populate seed data.`,
      },
    ],
    maxTokens: 8192,
  });

  const files = parseFiles(result.content);

  const envVars: { key: string; description: string }[] = [
    { key: 'NEXT_PUBLIC_SUPABASE_URL', description: 'Supabase project URL' },
    { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', description: 'Supabase anon key' },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', description: 'Supabase service role key (server only)' },
  ];

  if (job.architecture?.integrations.some(
    (i) => i.toLowerCase().includes('sms') || i.toLowerCase().includes('twilio')
  )) {
    envVars.push(
      { key: 'TWILIO_ACCOUNT_SID', description: 'Twilio account SID' },
      { key: 'TWILIO_AUTH_TOKEN', description: 'Twilio auth token' },
      { key: 'TWILIO_PHONE_NUMBER', description: 'Your Twilio phone number' }
    );
  }

  return {
    files,
    setupInstructions: `1. Create a Supabase project at supabase.com\n2. Copy .env.example to .env.local and fill in values\n3. Run schema.sql then seed.sql in the Supabase SQL editor\n4. Run npm install && npm run dev`,
    envVariables: envVars,
  };
}
