'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ALL_VERTICALS } from '@/lib/verticals';
import { THEMES } from '@/lib/themes';

type Step = 1 | 2 | 3 | 4;

const STAFF_OPTIONS = ['Just me', '2–3 people', '4–10 people', '10+ people'];
const VOLUME_OPTIONS = ['Under 20/day', '20–50/day', '50–100/day', '100+/day'];

export default function NewJobPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    vertical: '',
    businessName: '',
    businessType: '',
    ownerName: '',
    location: '',
    staffCount: STAFF_OPTIONS[0],
    dailyVolume: VOLUME_OPTIONS[0],
    specialNotes: '',
    theme: 'dark_pro',
  });

  const selectedVertical = ALL_VERTICALS.find((v) => v.id === form.vertical);
  const selectedTheme = THEMES.find((t) => t.id === form.theme) ?? THEMES[0];

  function canAdvance() {
    if (step === 1) return !!form.vertical;
    if (step === 2) return !!(form.businessName.trim() && form.ownerName.trim());
    return true;
  }

  async function handleBuild() {
    setLoading(true);
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: form.businessName,
        businessType: selectedVertical?.name ?? form.businessType,
        ownerName: form.ownerName,
        vertical: form.vertical,
        theme: form.theme,
        wizardData: {
          vertical: form.vertical,
          theme: form.theme,
          staffCount: form.staffCount,
          dailyVolume: form.dailyVolume,
          location: form.location,
          specialNotes: form.specialNotes,
        },
      }),
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
        <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm transition-colors">Dashboard</Link>
        <span className="text-gray-600">/</span>
        <span className="text-gray-300 text-sm">New Platform</span>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-10">
          {(['Business Type', 'Details', 'Theme', 'Build'] as const).map((label, i) => {
            const n = (i + 1) as Step;
            const done = step > n;
            const active = step === n;
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 ${active ? 'opacity-100' : done ? 'opacity-70' : 'opacity-30'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${active ? 'bg-emerald-500 text-white' : done ? 'bg-emerald-700 text-white' : 'bg-gray-700 text-gray-400'}`}>
                    {done ? '✓' : n}
                  </div>
                  <span className={`text-sm ${active ? 'text-white' : 'text-gray-500'}`}>{label}</span>
                </div>
                {i < 3 && <div className="w-8 h-px bg-gray-700 mx-1" />}
              </div>
            );
          })}
        </div>

        {/* Step 1: Business Type */}
        {step === 1 && (
          <div>
            <h1 className="text-2xl font-semibold text-white mb-1">What type of business?</h1>
            <p className="text-gray-400 text-sm mb-6">Pick your vertical — we'll pre-configure the platform with the right workflow, terminology, and sample data.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {ALL_VERTICALS.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setForm({ ...form, vertical: v.id })}
                  className={`text-left p-4 rounded-xl border transition-all ${form.vertical === v.id ? 'border-emerald-500 bg-emerald-500/10' : 'border-gray-700 bg-gray-900 hover:border-gray-600'}`}
                >
                  <div className="text-2xl mb-2">{v.emoji}</div>
                  <div className="text-white font-medium text-sm mb-0.5">{v.name}</div>
                  <div className="text-gray-500 text-xs">{v.tagline}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {v.workflowStages.slice(0, 3).map((s) => (
                      <span key={s.id} className="text-xs text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">{s.label}</span>
                    ))}
                    {v.workflowStages.length > 3 && <span className="text-xs text-gray-700">+{v.workflowStages.length - 3}</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Business Details */}
        {step === 2 && (
          <div>
            <h1 className="text-2xl font-semibold text-white mb-1">Tell us about the business</h1>
            <p className="text-gray-400 text-sm mb-6">This shapes every part of the platform — from the UI copy to the pricing defaults.</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Business name <span className="text-red-400">*</span></label>
                  <input required type="text" placeholder={`e.g. Joe's ${selectedVertical?.name ?? 'Shop'}`}
                    value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Owner name <span className="text-red-400">*</span></label>
                  <input required type="text" placeholder="e.g. Joe Smith"
                    value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">City / Location <span className="text-gray-600 font-normal">(optional)</span></label>
                <input type="text" placeholder="e.g. Chicago, IL"
                  value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Staff size</label>
                  <select value={form.staffCount} onChange={(e) => setForm({ ...form, staffCount: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors text-sm">
                    {STAFF_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Daily volume</label>
                  <select value={form.dailyVolume} onChange={(e) => setForm({ ...form, dailyVolume: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors text-sm">
                    {VOLUME_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Anything special about your workflow? <span className="text-gray-600 font-normal">(optional)</span></label>
                <textarea rows={3} placeholder="e.g. We offer rush same-day service, we pick up and deliver to hotels..."
                  value={form.specialNotes} onChange={(e) => setForm({ ...form, specialNotes: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors text-sm resize-none" />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Design Theme */}
        {step === 3 && (
          <div>
            <h1 className="text-2xl font-semibold text-white mb-1">How should it look?</h1>
            <p className="text-gray-400 text-sm mb-6">The theme is applied throughout — dashboard, counter screen, customer-facing pages. You can always change it later.</p>
            <div className="grid grid-cols-2 gap-4">
              {THEMES.map((t) => (
                <button key={t.id} onClick={() => setForm({ ...form, theme: t.id })}
                  className={`text-left p-5 rounded-xl border transition-all ${form.theme === t.id ? 'border-emerald-500 bg-emerald-500/10' : 'border-gray-700 bg-gray-900 hover:border-gray-600'}`}>
                  <div className="flex gap-2 mb-3">
                    {t.previewColors.map((c, i) => (
                      <div key={i} className={`w-6 h-6 rounded-full ${c} border border-white/10`} />
                    ))}
                  </div>
                  <div className="text-white font-medium text-sm mb-0.5">{t.name}</div>
                  <div className="text-gray-500 text-xs">{t.description}</div>
                  {form.theme === t.id && <div className="mt-2 text-xs text-emerald-400 font-medium">Selected</div>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Review & Build */}
        {step === 4 && selectedVertical && (
          <div>
            <h1 className="text-2xl font-semibold text-white mb-1">Ready to build</h1>
            <p className="text-gray-400 text-sm mb-6">Review what the factory will build. This takes about 2–4 minutes.</p>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-5">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">Business</p>
                  <p className="text-white font-medium">{form.businessName}</p>
                  <p className="text-gray-400">{form.ownerName}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Vertical</p>
                  <p className="text-white font-medium">{selectedVertical.emoji} {selectedVertical.name}</p>
                  <p className="text-gray-400">{form.staffCount} · {form.dailyVolume}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Theme</p>
                  <div className="flex gap-1.5 items-center">
                    {selectedTheme.previewColors.map((c, i) => (
                      <div key={i} className={`w-4 h-4 rounded-full ${c} border border-white/10`} />
                    ))}
                  </div>
                  <p className="text-gray-400 mt-1">{selectedTheme.name}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">What you're getting</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {[
                  `${selectedVertical.workflowStages.length}-stage ${selectedVertical.terminology.order} tracking`,
                  `${selectedVertical.defaultServices.length} pre-configured services`,
                  `Sample ${selectedVertical.terminology.customers} & data pre-loaded`,
                  'Multi-tenant, production-grade code',
                  'SMS customer notifications',
                  'Analytics dashboard',
                  'Staff management',
                  'GitHub-exportable codebase',
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="text-emerald-500 text-xs">✓</span> {f}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Pipeline stages</p>
              <div className="flex flex-wrap gap-2">
                {['Research & PRD', 'System Architecture', 'Tech Stack Selection', 'Code Generation', 'Code Review', 'Deploy to Vercel'].map((s, i) => (
                  <span key={i} className="text-xs bg-gray-800 text-gray-400 px-2.5 py-1 rounded-full">
                    {i + 1}. {s}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-3">You'll review the product tier and architecture before building starts. Everything else runs automatically.</p>
            </div>

            <button onClick={handleBuild} disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white py-4 rounded-xl font-semibold text-base transition-colors flex items-center justify-center gap-2">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Starting the factory...</>
              ) : (
                <>Build {form.businessName || 'my platform'} <span className="text-emerald-300">→</span></>
              )}
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          {step > 1 ? (
            <button onClick={() => setStep((s) => (s - 1) as Step)} className="text-gray-400 hover:text-white text-sm transition-colors">
              ← Back
            </button>
          ) : <div />}
          {step < 4 && (
            <button onClick={() => setStep((s) => (s + 1) as Step)} disabled={!canAdvance()}
              className="bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
              Continue →
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
