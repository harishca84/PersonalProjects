'use client';

import { useEffect, useState, useRef, use } from 'react';
import Link from 'next/link';
import { Job, Tier } from '@/types/factory';

const STAGE_ORDER = ['discovery', 'prd', 'architecture', 'tech_stack', 'build', 'test', 'deploy'];

export default function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [job, setJob] = useState<Job | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const [running, setRunning] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  function loadJob() {
    fetch(`/api/jobs/${id}`)
      .then((r) => r.json())
      .then(setJob);
  }

  useEffect(() => {
    loadJob();
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [job?.discoveryChat]);

  async function sendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || sending) return;
    setSending(true);
    await fetch(`/api/jobs/${id}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: chatInput }),
    });
    setChatInput('');
    setSending(false);
    loadJob();
  }

  async function runStage() {
    setRunning(true);
    await fetch(`/api/jobs/${id}/stage`, { method: 'POST' });
    setRunning(false);
    loadJob();
  }

  async function approve(body: Record<string, string>) {
    setRunning(true);
    await fetch(`/api/jobs/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setRunning(false);
    loadJob();
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
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
        <span className="text-gray-300 text-sm">{job.businessName}</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: pipeline stages */}
        <aside className="w-56 border-r border-gray-800 bg-gray-900 p-4 flex-shrink-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Pipeline</p>
          <div className="space-y-1">
            {STAGE_ORDER.map((stageName) => {
              const stage = job.stages[stageName as keyof typeof job.stages];
              if (!stage) return null;
              return (
                <div key={stageName} className="flex items-center gap-2.5 py-1.5">
                  <StageIndicator status={stage.status} />
                  <span
                    className={`text-sm ${
                      stage.status === 'completed'
                        ? 'text-gray-400'
                        : stage.status === 'running' || stage.status === 'awaiting_approval'
                        ? 'text-white'
                        : 'text-gray-600'
                    }`}
                  >
                    {stage.name}
                  </span>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {/* Discovery chat */}
          {(job.status === 'discovery' || job.discoveryChat.length > 0) && (
            <DiscoverySection
              job={job}
              chatInput={chatInput}
              setChatInput={setChatInput}
              sending={sending}
              onSend={sendChat}
              chatEndRef={chatEndRef}
            />
          )}

          {/* PRD generation: auto-trigger */}
          {job.status === 'prd' && (
            <AutoRunSection
              label="Generating your Product Requirements Document..."
              buttonLabel="Generate PRD"
              running={running}
              onRun={runStage}
            />
          )}

          {/* PRD review: tier selection */}
          {job.status === 'prd_review' && job.prd && (
            <TierSelection prd={job.prd} running={running} onSelect={(tier) => approve({ tier })} />
          )}

          {/* Architecture generation */}
          {job.status === 'architecture' && (
            <AutoRunSection
              label={`Designing architecture for the ${job.chosenTier} tier...`}
              buttonLabel="Generate Architecture"
              running={running}
              onRun={runStage}
            />
          )}

          {/* Architecture review */}
          {job.status === 'arch_review' && job.architecture && (
            <ArchReview
              arch={job.architecture}
              running={running}
              onApprove={() => approve({})}
            />
          )}

          {/* Tech stack + Build (auto-runs together) */}
          {(job.status === 'tech_stack' || job.status === 'building') && (
            <AutoRunSection
              label={
                job.status === 'tech_stack'
                  ? 'Selecting the best tech stack...'
                  : 'Building your platform...'
              }
              buttonLabel="Select Stack & Build"
              running={running}
              onRun={runStage}
            />
          )}

          {/* Live: show output */}
          {job.status === 'live' && job.buildOutput && (
            <BuildOutputSection output={job.buildOutput} job={job} />
          )}

          {/* Failed */}
          {job.status === 'failed' && (
            <div className="p-8">
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
                <h2 className="text-red-400 font-medium mb-2">Pipeline failed</h2>
                <p className="text-gray-400 text-sm">
                  Check the stage that failed for details. You can retry by refreshing and running
                  the stage again.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function StageIndicator({ status }: { status: string }) {
  if (status === 'completed')
    return <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />;
  if (status === 'running')
    return (
      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 flex-shrink-0 animate-pulse" />
    );
  if (status === 'awaiting_approval')
    return <div className="w-2.5 h-2.5 rounded-full bg-amber-400 flex-shrink-0" />;
  if (status === 'failed')
    return <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />;
  return <div className="w-2.5 h-2.5 rounded-full border border-gray-600 flex-shrink-0" />;
}

function DiscoverySection({
  job,
  chatInput,
  setChatInput,
  sending,
  onSend,
  chatEndRef,
}: {
  job: Job;
  chatInput: string;
  setChatInput: (v: string) => void;
  sending: boolean;
  onSend: (e: React.FormEvent) => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-800 px-6 py-4">
        <h2 className="text-white font-medium">Discovery</h2>
        <p className="text-gray-400 text-sm mt-0.5">
          Answer the factory's questions so it can understand your business.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {job.discoveryChat.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-800 text-gray-200'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      {job.status === 'discovery' && (
        <div className="border-t border-gray-800 px-6 py-4">
          <form onSubmit={onSend} className="flex gap-3">
            <input
              type="text"
              placeholder="Type your answer..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
            />
            <button
              type="submit"
              disabled={sending || !chatInput.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {sending ? '...' : 'Send'}
            </button>
          </form>
        </div>
      )}
      {job.status !== 'discovery' && job.discoverySummary && (
        <div className="border-t border-gray-800 p-6">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Discovery Summary
          </p>
          <p className="text-gray-300 text-sm whitespace-pre-wrap">{job.discoverySummary}</p>
        </div>
      )}
    </div>
  );
}

function AutoRunSection({
  label,
  buttonLabel,
  running,
  onRun,
}: {
  label: string;
  buttonLabel: string;
  running: boolean;
  onRun: () => void;
}) {
  return (
    <div className="p-8 flex flex-col items-center justify-center gap-4 min-h-64">
      <div className="text-gray-300 text-sm">{label}</div>
      <button
        onClick={onRun}
        disabled={running}
        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
      >
        {running ? 'Running...' : buttonLabel}
      </button>
    </div>
  );
}

function TierSelection({
  prd,
  running,
  onSelect,
}: {
  prd: NonNullable<Job['prd']>;
  running: boolean;
  onSelect: (tier: Tier) => void;
}) {
  const tiers: Tier[] = ['starter', 'standard', 'pro'];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-white font-medium text-lg mb-1">Choose your tier</h2>
        <p className="text-gray-400 text-sm">{prd.executiveSummary}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
        {tiers.map((tier) => {
          const t = prd.tiers[tier];
          return (
            <div
              key={tier}
              className={`relative bg-gray-900 border rounded-xl p-5 ${
                t.recommended ? 'border-emerald-500' : 'border-gray-700'
              }`}
            >
              {t.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs px-3 py-0.5 rounded-full">
                  Recommended
                </div>
              )}
              <h3 className="text-white font-semibold mb-1">{t.name}</h3>
              <p className="text-emerald-400 font-medium text-sm mb-3">{t.price}</p>
              <p className="text-gray-400 text-xs mb-3">{t.description}</p>
              <ul className="space-y-1.5 mb-5">
                {t.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => onSelect(tier)}
                disabled={running}
                className={`w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                  t.recommended
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
                }`}
              >
                Select {t.name}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ArchReview({
  arch,
  running,
  onApprove,
}: {
  arch: NonNullable<Job['architecture']>;
  running: boolean;
  onApprove: () => void;
}) {
  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-white font-medium text-lg mb-1">Architecture Review</h2>
          <p className="text-gray-400 text-sm max-w-xl">{arch.overview}</p>
        </div>
        <button
          onClick={onApprove}
          disabled={running}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ml-4"
        >
          {running ? 'Working...' : 'Approve & Build'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Section title="Components">
          {arch.components.map((c, i) => (
            <div key={i} className="mb-2">
              <span className="text-white text-sm font-medium">{c.name}</span>
              <span className="text-gray-500 text-xs ml-2">{c.technology}</span>
              <p className="text-gray-400 text-xs mt-0.5">{c.purpose}</p>
            </div>
          ))}
        </Section>

        <Section title="Data Models">
          {arch.dataModels.map((m, i) => (
            <div key={i} className="mb-2">
              <span className="text-white text-sm font-medium">{m.name}</span>
              <div className="mt-1 space-y-0.5">
                {m.fields.map((f, fi) => (
                  <p key={fi} className="text-gray-500 text-xs font-mono">{f}</p>
                ))}
              </div>
            </div>
          ))}
        </Section>

        <Section title="API Endpoints">
          {arch.apiEndpoints.slice(0, 8).map((e, i) => (
            <div key={i} className="flex items-start gap-2 mb-1.5">
              <span className="text-xs font-mono text-emerald-400 flex-shrink-0 w-12">{e.method}</span>
              <span className="text-xs font-mono text-gray-300">{e.path}</span>
            </div>
          ))}
        </Section>

        <Section title="Integrations & Deployment">
          <div className="mb-3">
            {arch.integrations.map((int, i) => (
              <span key={i} className="inline-block bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded mr-1.5 mb-1.5">
                {int}
              </span>
            ))}
          </div>
          <p className="text-gray-400 text-sm">
            <span className="text-gray-500 text-xs">Deploy target: </span>
            {arch.deploymentTarget}
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  );
}

function BuildOutputSection({ output, job }: { output: NonNullable<Job['buildOutput']>; job: Job }) {
  const [activeFile, setActiveFile] = useState(output.files[0]?.path ?? '');
  const activeContent = output.files.find((f) => f.path === activeFile)?.content ?? '';

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-white font-medium text-lg mb-1">
            {job.businessName} — {job.chosenTier} tier platform is ready
          </h2>
          <p className="text-gray-400 text-sm">{output.files.length} files generated</p>
        </div>
        <span className="bg-emerald-500/20 text-emerald-400 text-sm px-3 py-1 rounded-full font-medium">
          Live
        </span>
      </div>

      {/* Setup instructions */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
          Setup Instructions
        </h3>
        <p className="text-gray-300 text-sm whitespace-pre-wrap">{output.setupInstructions}</p>
      </div>

      {/* Environment variables */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
          Environment Variables
        </h3>
        <div className="space-y-1.5">
          {output.envVariables.map((v) => (
            <div key={v.key} className="flex items-start gap-3">
              <span className="text-xs font-mono text-emerald-400 flex-shrink-0">{v.key}</span>
              <span className="text-xs text-gray-500">{v.description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* File explorer */}
      {output.files.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="flex">
            <div className="w-56 border-r border-gray-800 overflow-y-auto max-h-96">
              {output.files.map((f) => (
                <button
                  key={f.path}
                  onClick={() => setActiveFile(f.path)}
                  className={`w-full text-left px-3 py-2 text-xs font-mono truncate transition-colors ${
                    activeFile === f.path
                      ? 'bg-gray-800 text-emerald-400'
                      : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                  }`}
                >
                  {f.path}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-auto max-h-96 p-4">
              <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">
                {activeContent}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
