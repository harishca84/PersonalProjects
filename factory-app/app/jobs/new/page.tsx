'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewJobPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    businessName: '',
    businessType: '',
    ownerName: '',
    description: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const job = await res.json();
    router.push(`/jobs/${job.id}`);
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
          <span className="text-white text-sm font-bold">F</span>
        </div>
        <span className="text-white font-semibold text-lg">AI Factory</span>
        <span className="text-gray-600">/</span>
        <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm transition-colors">
          Dashboard
        </Link>
        <span className="text-gray-600">/</span>
        <span className="text-gray-300 text-sm">New Job</span>
      </header>

      <main className="max-w-xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-semibold text-white mb-2">Start a new job</h1>
        <p className="text-gray-400 text-sm mb-8">
          Tell the factory about the business. It will run a discovery conversation to understand
          their needs before building anything.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Business name <span className="text-red-400">*</span>
            </label>
            <input
              required
              type="text"
              placeholder="e.g. Joe's Dry Cleaning"
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Business type <span className="text-red-400">*</span>
            </label>
            <input
              required
              type="text"
              placeholder="e.g. Dry Cleaning, Shoe Repair, Tailoring"
              value={form.businessType}
              onChange={(e) => setForm({ ...form, businessType: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Owner name
            </label>
            <input
              type="text"
              placeholder="e.g. Joe Smith"
              value={form.ownerName}
              onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Brief description (optional)
            </label>
            <textarea
              rows={3}
              placeholder="Any initial context about their situation..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors text-sm resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-3 rounded-lg font-medium transition-colors"
          >
            {loading ? 'Starting...' : 'Start discovery conversation'}
          </button>
        </form>
      </main>
    </div>
  );
}
