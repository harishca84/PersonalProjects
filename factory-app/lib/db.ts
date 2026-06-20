import fs from 'fs';
import path from 'path';
import { Job, StageName } from '@/types/factory';

const DB_PATH = path.join(process.cwd(), '.factory', 'jobs.json');

function ensureDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readAll(): Record<string, Job> {
  ensureDir();
  if (!fs.existsSync(DB_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, Job>) {
  ensureDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export function getJobs(): Job[] {
  const data = readAll();
  return Object.values(data).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getJob(id: string): Job | null {
  return readAll()[id] ?? null;
}

export function saveJob(job: Job): Job {
  const data = readAll();
  data[job.id] = { ...job, updatedAt: new Date().toISOString() };
  writeAll(data);
  return data[job.id];
}

export function updateJob(id: string, updates: Partial<Job>): Job | null {
  const data = readAll();
  if (!data[id]) return null;
  data[id] = { ...data[id], ...updates, updatedAt: new Date().toISOString() };
  writeAll(data);
  return data[id];
}

export function initialStages(): Record<StageName, { name: string; status: 'pending' | 'running' }> {
  return {
    discovery: { name: 'Discovery', status: 'running' },
    prd: { name: 'Product Requirements', status: 'pending' },
    architecture: { name: 'Architecture', status: 'pending' },
    tech_stack: { name: 'Tech Stack', status: 'pending' },
    build: { name: 'Build', status: 'pending' },
    test: { name: 'Testing', status: 'pending' },
    deploy: { name: 'Deploy', status: 'pending' },
  };
}
