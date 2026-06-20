export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getJob, updateJob } from '@/lib/db';
import { generatePRD } from '@/lib/stages/prd';
import { generateArchitecture } from '@/lib/stages/architecture';
import { selectTechStack } from '@/lib/stages/tech-stack';
import { buildProduct } from '@/lib/stages/build';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = getJob(id);
  if (!job) return Response.json({ error: 'Not found' }, { status: 404 });

  try {
    switch (job.status) {
      case 'prd': {
        const prd = await generatePRD(job);
        await updateJob(id, {
          prd,
          status: 'prd_review',
          stages: {
            ...job.stages,
            prd: {
              ...job.stages.prd,
              status: 'awaiting_approval',
              completedAt: new Date().toISOString(),
            },
          },
        });
        return Response.json({ stage: 'prd', status: 'awaiting_review' });
      }

      case 'architecture': {
        const architecture = await generateArchitecture(job);
        await updateJob(id, {
          architecture,
          status: 'arch_review',
          stages: {
            ...job.stages,
            architecture: {
              ...job.stages.architecture,
              status: 'awaiting_approval',
              completedAt: new Date().toISOString(),
            },
          },
        });
        return Response.json({ stage: 'architecture', status: 'awaiting_review' });
      }

      case 'tech_stack': {
        const techStack = await selectTechStack(job);
        const jobWithStack = await updateJob(id, {
          techStack,
          status: 'building',
          stages: {
            ...job.stages,
            tech_stack: {
              ...job.stages.tech_stack,
              status: 'completed',
              completedAt: new Date().toISOString(),
            },
            build: {
              ...job.stages.build,
              status: 'running',
              startedAt: new Date().toISOString(),
            },
          },
        });

        const buildOutput = await buildProduct(jobWithStack!);
        await updateJob(id, {
          buildOutput,
          status: 'live',
          stages: {
            ...jobWithStack!.stages,
            build: {
              ...jobWithStack!.stages.build,
              status: 'completed',
              completedAt: new Date().toISOString(),
            },
          },
        });
        return Response.json({ stage: 'build', status: 'complete' });
      }

      default:
        return Response.json(
          { error: `No stage runner for current status: ${job.status}` },
          { status: 400 }
        );
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await updateJob(id, {
      status: 'failed',
      stages: {
        ...job.stages,
        [job.status]: {
          ...job.stages[job.status as keyof typeof job.stages],
          status: 'failed',
          error: errorMsg,
        },
      },
    });
    return Response.json({ error: errorMsg }, { status: 500 });
  }
}
