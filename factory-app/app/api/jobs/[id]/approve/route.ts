export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getJob, updateJob } from '@/lib/db';
import { Tier } from '@/types/factory';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const job = getJob(id);
  if (!job) return Response.json({ error: 'Not found' }, { status: 404 });

  if (job.status === 'prd_review') {
    const tier = body.tier as Tier;
    if (!['starter', 'standard', 'pro'].includes(tier)) {
      return Response.json({ error: 'Invalid tier' }, { status: 400 });
    }
    await updateJob(id, {
      chosenTier: tier,
      status: 'architecture',
      stages: {
        ...job.stages,
        architecture: {
          ...job.stages.architecture,
          status: 'running',
          startedAt: new Date().toISOString(),
        },
      },
    });
    return Response.json({ approved: true, nextStatus: 'architecture' });
  }

  if (job.status === 'arch_review') {
    await updateJob(id, {
      status: 'tech_stack',
      stages: {
        ...job.stages,
        tech_stack: {
          ...job.stages.tech_stack,
          status: 'running',
          startedAt: new Date().toISOString(),
        },
      },
    });
    return Response.json({ approved: true, nextStatus: 'tech_stack' });
  }

  return Response.json({ error: 'No pending review to approve' }, { status: 400 });
}
