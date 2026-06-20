export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getJobs, saveJob, initialStages } from '@/lib/db';
import { openingMessage } from '@/lib/stages/discovery';
import { Job } from '@/types/factory';

export async function GET() {
  return Response.json(getJobs());
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const job: Job = {
    id: crypto.randomUUID(),
    businessName: body.businessName || 'Unnamed Business',
    businessType: body.businessType || 'Service Business',
    ownerName: body.ownerName || '',
    description: body.description || '',
    status: 'discovery',
    discoveryChat: [
      {
        role: 'assistant',
        content: openingMessage(),
        timestamp: new Date().toISOString(),
      },
    ],
    stages: initialStages(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const saved = saveJob(job);
  return Response.json(saved, { status: 201 });
}
