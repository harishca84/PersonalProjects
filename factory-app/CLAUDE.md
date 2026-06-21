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

- **Next.js 16** with App Router — params are async Promises, not sync objects
- **TypeScript** throughout
- **Anthropic SDK** (`@anthropic-ai/sdk`) for all AI calls via `lib/claude.ts`
- **File-based storage** — jobs live in `.factory/jobs.json`, created at runtime
- **Tailwind CSS** for all styling
- **No external database** — keep it file-based until there is a clear reason to add one

---

## CRITICAL: Next.js 16 Breaking Changes

Route params are **Promises** in Next.js 16. Always `await` them:

```typescript
// CORRECT
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}

// WRONG (Next.js 15 style — will break)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
}
```

All route handlers must export `export const dynamic = 'force-dynamic';` to prevent static caching of dynamic routes.

---

## Key Files

| File | Purpose |
|---|---|
| `types/factory.ts` | All TypeScript types. Single source of truth. |
| `lib/claude.ts` | Anthropic API wrapper. All AI calls go through `generate()`. |
| `lib/db.ts` | File-based job CRUD. Jobs stored in `.factory/jobs.json`. |
| `lib/stages/discovery.ts` | Discovery conversation logic + summary extraction |
| `lib/stages/prd.ts` | PRD generation — outputs Starter/Standard/Pro tiers |
| `lib/stages/architecture.ts` | System design generation |
| `lib/stages/tech-stack.ts` | Tech stack selection |
| `lib/stages/build.ts` | Code generation (main build stage) |
| `app/api/jobs/[id]/stage/route.ts` | Triggers the next pipeline stage for a job |
| `app/api/jobs/[id]/approve/route.ts` | HITL approval: picks tier (PRD review) or approves architecture |
| `app/api/jobs/[id]/chat/route.ts` | Sends a message in the discovery conversation |
| `app/jobs/[id]/page.tsx` | Job detail page — shows pipeline stages and outputs |

---

## Model Assignment

Use the right model for the right stage. Do not switch without good reason.

| Stage | Model | Reason |
|---|---|---|
| Discovery | `claude-sonnet-4-6` | Conversational, cost-effective |
| PRD | `claude-opus-4-8` | Requires deep reasoning to produce good tier breakdowns |
| Architecture | `claude-opus-4-8` | High-stakes; wrong architecture is expensive to fix |
| Tech Stack | `claude-sonnet-4-6` | Decision-making, doesn't need Opus depth |
| Build | `claude-sonnet-4-6` | Code generation at scale; Opus is overkill |
| Monitor | `claude-haiku-4-5-20251001` | Runs continuously; must be low-cost |
| Evolve | `claude-opus-4-8` | Analyzing usage patterns and proposing features needs depth |

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
    ↓  status: 'tech_stack' → auto-triggers tech stack selection
Tech stack done → status: 'building' → auto-triggers build
Build done → status: 'live'
```

State transitions are managed in `app/api/jobs/[id]/stage/route.ts` and `approve/route.ts`.

---

## Job Status Values

```typescript
type JobStatus =
  | 'discovery'     // Active discovery conversation
  | 'prd'           // PRD being generated (automated)
  | 'prd_review'    // Waiting for human to pick a tier
  | 'architecture'  // Architecture being generated (automated)
  | 'arch_review'   // Waiting for human to approve architecture
  | 'tech_stack'    // Tech stack selection (automated)
  | 'building'      // Code generation in progress
  | 'live'          // Product built and deployed
  | 'failed'        // Pipeline failed at some stage
```

Stage status values: `'pending' | 'running' | 'awaiting_approval' | 'completed' | 'done' | 'failed'`

---

## Coding Rules

- **No secrets in code** — API keys come from environment variables only
- **No console.log in production paths** — use structured error returns
- **File line limit** — keep files under 200 lines; split if longer
- **No duplicate type definitions** — all types live in `types/factory.ts` only
- **JSON output from AI** — always use `result.content.match(/\{[\s\S]*\}/)` to extract JSON from Claude responses; never assume the response is pure JSON
- **Error handling** — all API routes must return `{ error: string }` with appropriate status codes on failure
- **No comments** unless the WHY is non-obvious
- **TypeScript strict** — no `any` types

---

## Build Stage Output Format

The build stage generates code using a specific file delimiter format. The regex to parse it:

```typescript
const regex = /===FILE: (.+?)===\n([\s\S]*?)===END===/g;
```

Prompt must instruct Claude to use exactly:
```
===FILE: path/to/file.ts===
// file content
===END===
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | YES | Anthropic API key for all Claude calls |

Add new env vars to `.env.local.example` when introducing them.

---

## Known Issues and Decisions Log

| Date | Issue / Decision | Resolution |
|---|---|---|
| 2026-06-20 | Factory app created and pushed | Initial commit `599b8bf` |
| 2026-06-21 | "Page not found" error on first run | Root cause: `types/factory.ts` was missing. Fixed in `7704b42`. The types file must exist for the app to compile. |
| 2026-06-21 | Stage status type gap | `StageStatus` union was missing `'awaiting_approval'` and `'completed'` — values used in route handlers. Fixed by expanding the union in `types/factory.ts`. |
| 2026-06-21 | `Job` type missing `description` field | The `POST /api/jobs` handler sets `description` on new jobs. Added as optional field to `Job`. |

---

## Context: Why This Exists

Decisions made in the planning conversation (documented in full at `/root/.claude/plans/has-some-thought-about-parallel-church.md`):

- Target market: SMBs (small service businesses) who can't afford custom software
- The factory is internal-only; the user (operator) runs it for clients
- First product: dry cleaning management platform
- The platform is generic (item intake → process → return) — works for dry cleaning, shoe repair, tailoring, watch repair, etc.
- All products are multi-tenant SaaS
- Branding: each business owner's name is prominent; platform name is subtle ("powered by [Platform]")
- The user's role is evolving — factory should be as self-sufficient as possible

**IMPORTANT**: Before starting any new build or major change, re-read the plan file. Decisions captured there are authoritative and may override assumptions from training data.

---

## Verification Checklist

When the factory is working correctly:

- [ ] Submit a job → it appears in dashboard with status `discovery`
- [ ] Chat messages in discovery → responses from Claude appear
- [ ] Trigger PRD → status becomes `prd_review`, tier breakdown appears
- [ ] Pick a tier → status moves to `architecture`
- [ ] Approve architecture → status moves to `tech_stack` then `building`
- [ ] Build completes → status is `live`, generated files are visible
- [ ] Total cost per job < $1 for Starter/Standard tiers
