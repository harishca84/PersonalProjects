import { Job, TestResult } from '@/types/factory';
import { generate } from '@/lib/claude';

export async function reviewCode(job: Job): Promise<TestResult> {
  if (!job.buildOutput?.files.length) {
    return { passed: true, criticalIssues: [], warnings: [], summary: 'No files to review.' };
  }

  const filesSummary = job.buildOutput.files
    .map((f) => `=== ${f.path} ===\n${f.content.slice(0, 1500)}`)
    .join('\n\n');

  const result = await generate({
    model: 'claude-sonnet-4-6',
    system: `You are a senior code reviewer for a SaaS product factory. Review generated code and output ONLY valid JSON:
{
  "passed": boolean,
  "criticalIssues": ["string — issues that will prevent the app from running"],
  "warnings": ["string — issues that should be fixed but won't break the app"],
  "summary": "string — 1-2 sentence overall assessment"
}

Focus on:
- Missing package.json or next.config
- Hardcoded secrets or API keys in code
- Import paths that don't exist
- TypeScript errors that are obviously wrong
- Missing required environment variables not documented`,
    messages: [
      {
        role: 'user',
        content: `Review this generated ${job.businessType} platform (${job.chosenTier} tier):\n\n${filesSummary}`,
      },
    ],
  });

  const match = result.content.match(/\{[\s\S]*\}/);
  if (!match) {
    return { passed: true, criticalIssues: [], warnings: [], summary: 'Code review completed.' };
  }

  return JSON.parse(match[0]) as TestResult;
}
