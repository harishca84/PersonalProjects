import { Job, BuildOutput, GeneratedFile } from '@/types/factory';
import { generate } from '@/lib/claude';

const SYSTEM = `You are the Build Agent for an AI Factory. Generate production-ready code for a service business SaaS.

Output format — use this EXACT format for each file, nothing else:

===FILE: path/to/file.ts===
// full file content here
===END===

Generate the most critical files first:
1. Database schema (SQL)
2. TypeScript types
3. Core API routes (orders CRUD)
4. Main dashboard page
5. Order creation form
6. Auth setup
7. Environment variable example

Rules:
- Real working code only, no placeholders
- Multi-tenant: all queries scoped by tenant_id
- Next.js 16 App Router (params is async Promise)
- TypeScript throughout
- Tailwind CSS for styling
- Supabase for DB/auth unless stack specifies otherwise`;

function parseFiles(raw: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const regex = /===FILE: (.+?)===\n([\s\S]*?)===END===/g;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    files.push({
      path: match[1].trim(),
      content: match[2].trim(),
      description: '',
    });
  }
  return files;
}

export async function buildProduct(job: Job): Promise<BuildOutput> {
  const tier = job.chosenTier ?? 'standard';
  const tierData = job.prd?.tiers[tier];
  const stackComponents = job.techStack?.components
    .map((c) => `${c.layer}: ${c.technology}`)
    .join(', ');

  const result = await generate({
    model: 'claude-sonnet-4-6',
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Build the ${tierData?.name} platform for ${job.businessName} (${job.businessType}).

Stack: ${job.techStack?.name}
Components: ${stackComponents}

Features to implement:
${tierData?.features.map((f) => `- ${f}`).join('\n')}

Data models:
${job.architecture?.dataModels.map((m) => `${m.name}: ${m.fields.join(', ')}`).join('\n')}

Key API endpoints:
${job.architecture?.apiEndpoints.map((e) => `${e.method} ${e.path}: ${e.purpose}`).join('\n')}

Generate the core files. Focus on working, production-quality code.`,
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

  if (job.architecture?.integrations.some((i) => i.toLowerCase().includes('sms') || i.toLowerCase().includes('twilio'))) {
    envVars.push(
      { key: 'TWILIO_ACCOUNT_SID', description: 'Twilio account SID' },
      { key: 'TWILIO_AUTH_TOKEN', description: 'Twilio auth token' },
      { key: 'TWILIO_PHONE_NUMBER', description: 'Your Twilio phone number' }
    );
  }

  return {
    files,
    setupInstructions: `1. Create a Supabase project at supabase.com\n2. Copy .env.example to .env.local and fill in values\n3. Run the schema SQL in Supabase SQL editor\n4. Run npm install && npm run dev`,
    envVariables: envVars,
  };
}
