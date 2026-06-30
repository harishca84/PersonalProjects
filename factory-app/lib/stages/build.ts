import { Job, BuildOutput, GeneratedFile } from '@/types/factory';
import { generate } from '@/lib/claude';

const SYSTEM = `You are the Build Agent for an AI Factory. Generate production-ready code for a service business SaaS.

Output format — use this EXACT format for each file, nothing else:

===FILE: path/to/file.ts===
// full file content here
===END===

REQUIRED files — always generate these first:
1. package.json (with all dependencies listed — this is MANDATORY for deployment)
2. next.config.ts
3. tailwind.config.ts
4. tsconfig.json
5. .env.example (document all required env vars)
6. Database schema (schema.sql)
7. TypeScript types (types/index.ts)
8. Core API routes (orders CRUD)
9. Main dashboard page (app/dashboard/page.tsx)
10. Order creation form

Rules:
- Real working code only, no placeholders
- Multi-tenant: all queries scoped by tenant_id
- Next.js 15 App Router (params is async Promise)
- TypeScript throughout
- Tailwind CSS for styling
- Supabase for DB/auth unless stack specifies otherwise
- package.json must include: next, react, react-dom, @supabase/supabase-js, typescript, tailwindcss, @types/react, @types/node`;

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
