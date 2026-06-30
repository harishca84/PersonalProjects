export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getJobs, saveJob, initialStages } from '@/lib/db';
import { openingMessage } from '@/lib/stages/discovery';
import { getVertical } from '@/lib/verticals';
import { Job, WizardData } from '@/types/factory';

export async function GET() {
  return Response.json(getJobs());
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const wizardData: WizardData | undefined = body.wizardData;
  const vertical = wizardData?.vertical ? getVertical(wizardData.vertical) : null;

  // Wizard-created jobs skip discovery and go straight to PRD generation
  const useWizard = !!(vertical && wizardData);

  const discoverySummary = useWizard
    ? buildWizardSummary(body, wizardData!, vertical!.domainContext)
    : undefined;

  const job: Job = {
    id: crypto.randomUUID(),
    businessName: body.businessName || 'Unnamed Business',
    businessType: body.businessType || 'Service Business',
    ownerName: body.ownerName || '',
    description: body.description || '',
    status: useWizard ? 'prd' : 'discovery',
    autoRun: useWizard,
    wizardData: wizardData,
    discoveryChat: useWizard
      ? []
      : [{ role: 'assistant', content: openingMessage(), timestamp: new Date().toISOString() }],
    discoverySummary,
    stages: initialStages(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const saved = saveJob(job);
  return Response.json(saved, { status: 201 });
}

function buildWizardSummary(
  body: Record<string, string>,
  data: WizardData,
  domainContext: string
): string {
  return `Business: ${body.businessName}
Type: ${body.businessType}
Owner: ${body.ownerName}
Location: ${data.location || 'Not specified'}
Staff: ${data.staffCount}
Daily volume: ${data.dailyVolume}
Design theme: ${data.theme}
${data.specialNotes ? `Special requirements: ${data.specialNotes}` : ''}

Domain context:
${domainContext}`;
}
