import fs from 'fs';
import path from 'path';
import { Job, StageName } from '@/types/factory';

// ---------------------------------------------------------------------------
// File-based storage (development / no DATABASE_URL)
// ---------------------------------------------------------------------------

const DB_PATH = path.join(process.cwd(), '.factory', 'jobs.json');

function ensureDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readAll(): Record<string, Job> {
  ensureDir();
  if (!fs.existsSync(DB_PATH)) return {};
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')); }
  catch { return {}; }
}

function writeAll(data: Record<string, Job>) {
  ensureDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ---------------------------------------------------------------------------
// PostgreSQL storage (production — set DATABASE_URL to enable)
// ---------------------------------------------------------------------------

let _pool: import('pg').Pool | null = null;

function pool() {
  if (!_pool) {
    // Dynamic import so pg is only loaded when DATABASE_URL is present
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require('pg') as typeof import('pg');
    _pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
  }
  return _pool;
}

async function pgGetJobs(): Promise<Job[]> {
  const { rows } = await pool().query('SELECT data FROM jobs ORDER BY created_at DESC');
  return rows.map((r) => r.data as Job);
}

async function pgGetJob(id: string): Promise<Job | null> {
  const { rows } = await pool().query('SELECT data FROM jobs WHERE id = $1', [id]);
  return rows[0]?.data ?? null;
}

async function pgSaveJob(job: Job): Promise<Job> {
  const updated = { ...job, updatedAt: new Date().toISOString() };
  await pool().query(
    `INSERT INTO jobs (id, data, created_at, updated_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = $4`,
    [job.id, updated, job.createdAt, updated.updatedAt]
  );
  return updated;
}

// ---------------------------------------------------------------------------
// Public API — auto-selects backend based on DATABASE_URL
// ---------------------------------------------------------------------------

const usePostgres = () => !!process.env.DATABASE_URL;

export async function getJobs(): Promise<Job[]> {
  if (usePostgres()) return pgGetJobs();
  const data = readAll();
  return Object.values(data).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getJob(id: string): Promise<Job | null> {
  if (usePostgres()) return pgGetJob(id);
  return readAll()[id] ?? null;
}

export async function saveJob(job: Job): Promise<Job> {
  if (usePostgres()) return pgSaveJob(job);
  const data = readAll();
  data[job.id] = { ...job, updatedAt: new Date().toISOString() };
  writeAll(data);
  return data[job.id];
}

export async function updateJob(id: string, updates: Partial<Job>): Promise<Job | null> {
  const existing = await getJob(id);
  if (!existing) return null;
  return saveJob({ ...existing, ...updates });
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
