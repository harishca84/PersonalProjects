import { Job, DeployResult } from '@/types/factory';

export async function deployToVercel(job: Job): Promise<DeployResult> {
  const token = process.env.VERCEL_TOKEN;

  if (!token) {
    return {
      url: null,
      deploymentId: null,
      deployedAt: new Date().toISOString(),
      status: 'no_token',
    };
  }

  const name = job.businessName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || 'factory-app';

  const files = (job.buildOutput?.files ?? []).map((f) => ({
    file: f.path,
    data: f.content,
  }));

  const res = await fetch('https://api.vercel.com/v13/deployments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      files,
      projectSettings: { framework: 'nextjs' },
      target: 'production',
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Vercel deployment failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  const url = `https://${data.url}`;

  return {
    url,
    deploymentId: data.id,
    deployedAt: new Date().toISOString(),
    status: 'deploying',
  };
}
