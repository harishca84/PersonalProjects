export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getJob, updateJob } from '@/lib/db';
import { continueDiscovery, summarizeDiscovery } from '@/lib/stages/discovery';
import { ChatMessage } from '@/types/factory';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { message } = await request.json();

  const job = getJob(id);
  if (!job) return Response.json({ error: 'Not found' }, { status: 404 });
  if (job.status !== 'discovery')
    return Response.json({ error: 'Job not in discovery stage' }, { status: 400 });

  const userMsg: ChatMessage = {
    role: 'user',
    content: message,
    timestamp: new Date().toISOString(),
  };
  const chatWithUser = [...job.discoveryChat, userMsg];

  const { response, isComplete } = await continueDiscovery(
    { ...job, discoveryChat: chatWithUser },
    message
  );

  const assistantMsg: ChatMessage = {
    role: 'assistant',
    content: response,
    timestamp: new Date().toISOString(),
  };
  const finalChat = [...chatWithUser, assistantMsg];

  if (isComplete) {
    const summary = await summarizeDiscovery(finalChat);
    await updateJob(id, {
      discoveryChat: finalChat,
      discoverySummary: summary,
      status: 'prd',
      stages: {
        ...job.stages,
        discovery: {
          ...job.stages.discovery,
          status: 'completed',
          completedAt: new Date().toISOString(),
        },
        prd: {
          ...job.stages.prd,
          status: 'running',
          startedAt: new Date().toISOString(),
        },
      },
    });
    return Response.json({ response, isComplete: true });
  }

  await updateJob(id, { discoveryChat: finalChat });
  return Response.json({ response, isComplete: false });
}
