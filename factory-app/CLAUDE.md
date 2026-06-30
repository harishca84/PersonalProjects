# AI Factory — Claude Working Guide

This is the source of truth for working on this codebase. Read it before touching anything.

---

## What This Project Is

An **AI-powered job runner** (Next.js web app) that takes a service business problem and produces a deployed, working SaaS platform. The factory is the engine; the service business platform is the product it builds.

Two distinct things:
- **This repo** = the factory (operator-facing, internal tool)
- **What it builds** = a multi-tenant service business platform (customer-facing SaaS)

---

## Tech Stack

- **Next.js 15** with App Router — params are async Promises, not sync objects
- **TypeScript** throughout
- **Google Gemini SDK** (`@google/generative-ai`) for all AI calls via `lib/claude.ts`
- **File-based storage** — jobs live in `.factory/jobs.json`, created at runtime
- **Tailwind CSS** for all styling
- **No external database** — keep it file-based until there is a clear reason to add one

---

## CRITICAL: Next.js App Router — Async Params

Route params are **Promises**. Always `await` them in route handlers. In client components, use `use()` from React:

```typescript
// Server-side route handler (API routes)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}

// Client component
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
}
```

All route handlers must export `export const dynamic = 'force-dynamic';` to prevent static caching of dynamic routes.

---

## AI Backend: Google Gemini (NOT Anthropic)

The factory uses Google Gemini via `lib/claude.ts`. The function signatures look like Claude but map to Gemini internally.

**Model name mapping:**
| Claude model string (used in code) | Gemini model used |
|---|---|
| `claude-opus-4-8` | `gemini-2.0-flash` |
| `claude-sonnet-4-6` | `gemini-2.0-flash` |
| `claude-haiku-4-5-20251001` | `gemini-2.0-flash-lite` |

**Critical Gemini constraint**: `startChat` history MUST start with a `user` role message. The `lib/claude.ts` wrapper handles this automatically by finding the first user message and slicing from there. Do NOT break this logic.

**Environment variable**: `GEMINI_API_KEY` (not `ANTHROPIC_API_KEY`). Get a free key at aistudio.google.com.

---

## Key Files

| File | Purpose |
|---|---|
| `types/factory.ts` | All TypeScript types. Single source of truth. |
| `lib/claude.ts` | Gemini API wrapper. All AI calls go through `generate()`. |
| `lib/db.ts` | File-based job CRUD. Jobs stored in `.factory/jobs.json`. |
| `lib/stages/discovery.ts` | Discovery conversation logic + summary extraction |
| `lib/stages/prd.ts` | PRD generation — outputs Starter/Standard/Pro tiers |
| `lib/stages/architecture.ts` | System design generation |
| `lib/stages/tech-stack.ts` | Tech stack selection |
| `lib/stages/build.ts` | Code generation (main build stage) |
| `lib/stages/test.ts` | Code review — checks generated files for critical issues |
| `lib/stages/deploy.ts` | Vercel deployment via REST API |
| `app/api/jobs/[id]/stage/route.ts` | Triggers the next pipeline stage for a job |
| `app/api/jobs/[id]/approve/route.ts` | HITL approval: tier selection, arch approval, test review |
| `app/api/jobs/[id]/chat/route.ts` | Sends a message in the discovery conversation |
| `app/jobs/[id]/page.tsx` | Job detail page — shows pipeline stages and outputs |

---

## Model Assignment

| Stage | Model string | Maps to Gemini |
|---|---|---|
| Discovery | `claude-sonnet-4-6` | gemini-2.0-flash |
| PRD | `claude-opus-4-8` | gemini-2.0-flash |
| Architecture | `claude-opus-4-8` | gemini-2.0-flash |
| Tech Stack | `claude-sonnet-4-6` | gemini-2.0-flash |
| Build | `claude-sonnet-4-6` | gemini-2.0-flash |
| Test | `claude-sonnet-4-6` | gemini-2.0-flash |
| Monitor | `claude-haiku-4-5-20251001` | gemini-2.0-flash-lite |
| Evolve | `claude-opus-4-8` | gemini-2.0-flash |

---

## Pipeline Flow

```
Job created (status: 'discovery')
    ↓  [chat messages via /api/jobs/[id]/chat]
Discovery complete → POST /api/jobs/[id]/stage → generates PRD
    ↓  status: 'prd_review' (HITL)
Owner picks tier → POST /api/jobs/[id]/approve { tier }
    ↓  status: 'architecture' → auto-triggers architecture generation
Architecture done → status: 'arch_review' (HITL)
Owner approves → POST /api/jobs/[id]/approve
    ↓  status: 'tech_stack' → auto-triggers tech stack + build
Build done → status: 'testing' → auto-triggers code review
    ↓  If critical issues found: status: 'test_review' (HITL)
    ↓  If no critical issues: status: 'deploying' → auto-triggers deploy
(HITL) Owner approves deployment → POST /api/jobs/[id]/approve
    ↓  status: 'deploying' → triggers Vercel deploy
Deploy done → status: 'live'  ← live URL available in job.liveUrl
```

State transitions: `app/api/jobs/[id]/stage/route.ts` and `approve/route.ts`.

---

## Job Status Values

```typescript
type JobStatus =
  | 'discovery'     // Active discovery conversation
  | 'prd'           // PRD being generated (automated)
  | 'prd_review'    // Waiting for human to pick a tier (HITL)
  | 'architecture'  // Architecture being generated (automated)
  | 'arch_review'   // Waiting for human to approve architecture (HITL)
  | 'tech_stack'    // Tech stack selection (automated)
  | 'building'      // Code generation in progress (automated)
  | 'testing'       // Code review in progress (automated)
  | 'test_review'   // Critical issues found — waiting for human decision (HITL)
  | 'deploying'     // Vercel deployment in progress (automated)
  | 'live'          // Product deployed — job.liveUrl contains the URL
  | 'failed'        // Pipeline failed at some stage
```

Stage status values: `'pending' | 'running' | 'awaiting_approval' | 'completed' | 'done' | 'failed'`

---

## Deployment

Deployment uses the Vercel REST API (`POST https://api.vercel.com/v13/deployments`).
- Requires `VERCEL_TOKEN` env var. Without it, deploy stage returns `status: 'no_token'` and the factory still shows generated files.
- `job.liveUrl` is set on successful deploy; `job.deployResult` has the full deploy response.
- The deploy stage uploads all generated files from `job.buildOutput.files` directly to Vercel.

---

## Coding Rules

- **No secrets in code** — API keys come from environment variables only
- **No console.log in production paths** — use structured error returns
- **File line limit** — keep files under 200 lines; split if longer
- **No duplicate type definitions** — all types live in `types/factory.ts` only
- **JSON output from AI** — always use `result.content.match(/\{[\s\S]*\}/)` to extract JSON; never assume the response is pure JSON
- **Error handling** — all API routes must return `{ error: string }` with appropriate status codes on failure
- **No comments** unless the WHY is non-obvious
- **TypeScript strict** — no `any` types

---

## Build Stage Output Format

The build stage generates code using a specific file delimiter format. The regex to parse it:

```typescript
const regex = /===FILE: (.+?)===\n([\s\S]*?)===END===/g;
```

Prompt must instruct the AI to use exactly:
```
===FILE: path/to/file.ts===
// file content
===END===
```

Build stage ALWAYS generates these files first (required for Vercel deployment):
1. `package.json` — with all dependencies listed
2. `next.config.ts`
3. `tailwind.config.ts`
4. `tsconfig.json`
5. `.env.example`

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | YES | Google Gemini API key (free at aistudio.google.com) |
| `VERCEL_TOKEN` | NO | Vercel token for deployment (vercel.com/account/tokens) |

Add new env vars to `.env.local.example` when introducing them.

---

## Known Issues and Decisions Log

| Date | Issue / Decision | Resolution |
|---|---|---|
| 2026-06-20 | Factory app created and pushed | Initial commit `599b8bf` |
| 2026-06-21 | "Page not found" error on first run | `types/factory.ts` was missing. Fixed in `7704b42`. |
| 2026-06-21 | Stage status type gap | `StageStatus` was missing `'awaiting_approval'` and `'completed'`. Fixed. |
| 2026-06-21 | `Job` type missing `description` field | Added as optional field to `Job` in `types/factory.ts`. |
| 2026-06-21 | Switched AI backend from Anthropic to Google Gemini | Anthropic requires paid credits; Gemini has a free tier. `lib/claude.ts` now wraps Gemini but exposes the same `generate()` API. |
| 2026-06-21 | Gemini history must start with user role | Discovery chat opens with an assistant message. Gemini's `startChat` rejects this. Fixed in `lib/claude.ts` by slicing history to start from the first user message. |
| 2026-06-21 | Gemini model names were wrong | Used `gemini-1.5-pro` etc. (invalid). Corrected to `gemini-2.0-flash` and `gemini-2.0-flash-lite`. |
| 2026-06-21 | Discovery agent repeated same question | `chat/route.ts` was double-appending user messages to context. Fixed by passing original `job` (not the updated chat) to `continueDiscovery`. |
| 2026-06-30 | Test + Deploy stages added | Pipeline now continues beyond build: build → testing → (test_review if issues) → deploying → live. |

---

## Context: Why This Exists

Decisions made in the planning conversation (documented in full at `/root/.claude/plans/has-some-thought-about-parallel-church.md`):

- Target market: SMBs (small service businesses) who can't afford custom software
- The factory is internal-only; the user (operator) runs it for clients (agency model)
- First product: dry cleaning management platform
- The platform is generic (item intake → process → return) — works for dry cleaning, shoe repair, tailoring, watch repair, etc.
- All products are multi-tenant SaaS with row-level isolation
- Branding: each business owner's name is prominent; platform name is subtle ("powered by [Platform]")
- 3 tiers: Starter / Standard / Pro (scope-based, not UX variants)
- The factory decides the tech stack per product — no hardcoded stack

**IMPORTANT**: Before starting any new build or major change, re-read the plan file. Decisions captured there are authoritative.

---

## Verification Checklist

When the factory is working correctly:

- [ ] Submit a job → it appears in dashboard with status `discovery`
- [ ] Chat messages in discovery → responses from Gemini appear
- [ ] Trigger PRD → status becomes `prd_review`, tier breakdown appears
- [ ] Pick a tier → status moves to `architecture`
- [ ] Approve architecture → status moves to `tech_stack` then `building`
- [ ] Build completes → status moves to `testing`
- [ ] Code review runs → if clean, moves to `deploying`; if issues, shows `test_review` with HITL
- [ ] Deploy completes → status is `live`, `job.liveUrl` has the Vercel URL
- [ ] Without `VERCEL_TOKEN`: deploy skips gracefully, status is `live` but no URL
