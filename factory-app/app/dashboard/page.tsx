'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Job, JobStatus } from '@/types/factory';

const STATUS_LABELS: Record<JobStatus, string> = {
  discovery: 'Discovery',
  prd: 'Generating PRD',
  prd_review: 'Awaiting Tier Selection',
  architecture: 'Designing Architecture',
  arch_review: 'Awaiting Architecture Approval',
  tech_stack: 'Selecting Tech Stack',
  building: 'Building',
  live: 'Live',
  failed: 'Failed',
};

const STATUS_COLORS: Record<JobStatus, string> = {
  discovery: 'bg-blue-500/20 text-blue-400',
  prd: 'bg-yellow-500/20 text-yellow-400',
  prd_review: 'bg-amber-500/20 text-amber-400',
  architecture: 'bg-purple-500/20 text-purple-400',
  arch_review: 'bg-amber-500/20 text-amber-400',
  tech_stack: 'bg-purple-500/20 text-purple-400',
  building: 'bg-emerald-500/20 text-emerald-400',
  live: 'bg-emerald-500/20 text-emerald-400',
  failed: 'bg-red-500/20 text-red-400',
};

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/jobs')
      .then((r) => r.json())
      .then((data) => {
        setJobs(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">F</span>
          </div>
          <span className="text-white font-semibold text-lg">AI Factory</span>
        </div>
        <Link
          href="/jobs/new"
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + New Job
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold text-white mb-2">Jobs</h1>
        <p className="text-gray-400 text-sm mb-8">
          Each job is a business that the factory is building a platform for.
        </p>

        {loading && (
          <div className="text-gray-500 text-sm">Loading...</div>
        )}

        {!loading && jobs.length === 0 && (
          <div className="border border-dashed border-gray-700 rounded-xl p-12 text-center">
            <p className="text-gray-500 mb-4">No jobs yet.</p>
            <Link
              href="/jobs/new"
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Start your first job
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="block bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-white font-medium">{job.businessName}</h2>
                    <span className="text-gray-500 text-xs">·</span>
                    <span className="text-gray-400 text-sm">{job.businessType}</span>
                  </div>
                  {job.chosenTier && (
                    <span className="text-xs text-gray-500 capitalize">
                      {job.chosenTier} tier
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[job.status]}`}
                  >
                    {STATUS_LABELS[job.status]}
                  </span>
                  <span className="text-gray-600 text-xs">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
