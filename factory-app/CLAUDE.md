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
- **Storage** — auto-detects: file-based (`.factory/jobs.json`) when `DATABASE_URL` is unset; PostgreSQL (`pg` package) when `DATABASE_URL` is set
- **Tailwind CSS** for all styling
- **`pg` + `@types/pg`** — installed but only loaded when `DATABASE_URL` is present

---

## Owner Preferences (Never Violate Without Asking)

| Preference | Detail |
|---|---|
| **Self-hosted** | The factory runs on a Mac mini the owner is buying — not Vercel, Railway, or any managed platform |
| **Own domain** | Custom domain via Nginx reverse proxy on the Mac mini |
| **PostgreSQL on Mac mini** | When the Mac mini arrives: `brew install postgresql@16` + run `schema.sql`. Until then, file-based storage is fine. |
| **No Supabase** | Owner explicitly rejected Supabase. PostgreSQL is self-hosted on the Mac mini. |
| **Gemini, not Anthropic** | Gemini free tier is being used. Do not switch to Anthropic SDK unless explicitly asked. |
| **File-based fallback** | During development (no Mac mini yet), file-based storage must keep working. `DATABASE_URL` auto-detection is the switch mechanism. |
| **Build first, document after** | Owner prefers to see working code before documentation. Don't block builds on docs. |
| **SMB focus** | Target market is small service businesses (dry cleaners, tailors, shoe repairers). All UI copy, pipeline prompts, and sample data must reflect this. |

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

## CRITICAL: All db.ts functions are async

`getJobs()`, `getJob()`, `saveJob()`, `updateJob()` are all async — they must be `await`-ed at every call site. This is because the PostgreSQL backend is async and the file-based backend is wrapped to match.

---

## AI Backend: Google Gemini (NOT Anthropic)

The factory uses Google Gemini via `lib/claude.ts`. The function signatures look like Claude but map to Gemini internally.

**Model name mapping:**
| Claude model string (used in code) | Gemini model used |
|---|---|
| `claude-opus-4-8` | `gemini-2.5-flash` |
| `claude-sonnet-4-6` | `gemini-2.5-flash` |
| `claude-haiku-4-5-20251001` | `gemini-2.5-flash` |

**Why `gemini-2.5-flash` for all tiers?** `gemini-2.0-flash` and `gemini-2.0-flash-lite` are no longer available on the owner's free-tier API key. `gemini-2.5-flash` works for all calls.

**Critical Gemini constraint**: `startChat` history MUST start with a `user` role message. The `lib/claude.ts` wrapper handles this automatically by finding the first user message and slicing from there. Do NOT break this logic.

**Environment variable**: `GEMINI_API_KEY`. The key format used is `AQ.xxx...` (Google AI Studio format — valid but different from the `AIzaSy...` format). Both formats work with the SDK.

**Proxy**: This environment routes HTTPS through a local proxy (`HTTPS_PROXY=http://127.0.0.1:41205`). The Gemini SDK respects this automatically for outbound calls. Do not disable the proxy or unset `HTTPS_PROXY`.

---

## Key Files

| File | Purpose |
|---|---|
| `types/factory.ts` | All TypeScript types. Single source of truth. |
| `lib/claude.ts` | Gemini API wrapper. All AI calls go through `generate()`. |
| `lib/db.ts` | Job CRUD — auto-selects file or PostgreSQL based on `DATABASE_URL`. |
| `lib/verticals.ts` | 5 vertical configurations (dry cleaning, shoe repair, tailoring, watch repair, auto detailing). |
| `lib/themes.ts` | 4 design themes (dark_pro, light_clean, warm_earthy, modern_minimal). |
| `lib/stages/discovery.ts` | Discovery conversation logic + summary extraction |
| `lib/stages/prd.ts` | PRD generation — outputs Starter/Standard/Pro tiers |
| `lib/stages/architecture.ts` | System design generation |
| `lib/stages/tech-stack.ts` | Tech stack selection |
| `lib/stages/build.ts` | Code generation (main build stage) |
| `lib/stages/test.ts` | Code review — checks generated files for critical issues |
| `lib/stages/deploy.ts` | Vercel deployment via REST API |
| `schema.sql` | PostgreSQL schema — run once on Mac mini to create the `jobs` table |
| `app/api/jobs/[id]/stage/route.ts` | Triggers the next pipeline stage for a job |
| `app/api/jobs/[id]/approve/route.ts` | HITL approval: tier selection, arch approval, test review |
| `app/api/jobs/[id]/chat/route.ts` | Sends a message in the discovery conversation |
| `app/jobs/[id]/page.tsx` | Job detail page — pipeline progress, auto-run, reveal animation |
| `app/jobs/new/page.tsx` | 4-step wizard: vertical → details → theme → review & build |

---

## Model Assignment

| Stage | Model string | Maps to Gemini |
|---|---|---|
| Discovery | `claude-sonnet-4-6` | gemini-2.5-flash |
| PRD | `claude-opus-4-8` | gemini-2.5-flash |
| Architecture | `claude-opus-4-8` | gemini-2.5-flash |
| Tech Stack | `claude-sonnet-4-6` | gemini-2.5-flash |
| Build | `claude-sonnet-4-6` | gemini-2.5-flash |
| Test | `claude-sonnet-4-6` | gemini-2.5-flash |
| Monitor | `claude-haiku-4-5-20251001` | gemini-2.5-flash |
| Evolve | `claude-opus-4-8` | gemini-2.5-flash |

---

## Pipeline Flow

```
Wizard job created (status: 'prd', autoRun: true)
    ↓  auto-runs 1.2s after page load
PRD generated → status: 'prd_review' (HITL — owner picks tier)
Owner picks tier → POST /api/jobs/[id]/approve { tier }
    ↓  status: 'architecture' → auto-triggers architecture generation
Architecture done → status: 'arch_review' (HITL — owner approves)
Owner approves → POST /api/jobs/[id]/approve
    ↓  status: 'tech_stack' → auto-triggers tech stack + build
Build done → status: 'testing' → auto-triggers code review
    ↓  If critical issues: status: 'test_review' (HITL)
    ↓  If clean: status: 'deploying' → auto-triggers Vercel deploy
Deploy done → status: 'live'  ← reveal animation fires on the job page

Discovery (manual) jobs still exist:
status: 'discovery' → chat via /api/jobs/[id]/chat until complete
→ then follows same PRD → Architecture → ... path as above
```

### Auto-run Logic (job detail page)

- Page polls every 3s when `job.status` is in `ACTIVE_STATUSES`
- `useEffect` fires `runStage()` after 1.2s when `job.autoRun && AUTO_RUN_STATUSES.includes(job.status)`
- `autoRunRef` prevents double-triggering between re-renders

---

## Job Status Values

```typescript
type JobStatus =
  | 'discovery'     // Active discovery conversation
  | 'prd'           // PRD being generated (auto-run)
  | 'prd_review'    // Waiting for human to pick a tier (HITL)
  | 'architecture'  // Architecture being generated (auto-run)
  | 'arch_review'   // Waiting for human to approve architecture (HITL)
  | 'tech_stack'    // Tech stack selection (auto-run)
  | 'building'      // Code generation in progress (auto-run)
  | 'testing'       // Code review in progress (auto-run)
  | 'test_review'   // Critical issues found — waiting for human (HITL)
  | 'deploying'     // Vercel deployment in progress (auto-run)
  | 'live'          // Product deployed — job.liveUrl contains the URL
  | 'failed'        // Pipeline failed at some stage
```

---

## Vertical System

`lib/verticals.ts` exports `ALL_VERTICALS` and `getVertical(id)`.

Each vertical has:
- `id`, `name`, `emoji`, `tagline`
- `terminology` — `{ order, item, customer, staff, ready, intake }` — injected into PRD + build prompts
- `workflowStages` — array of `{ id, label }` — injected into build prompts
- `defaultServices` — array of `{ name, basePrice }` — used in seed data
- `sampleCustomers` — array of `{ name, phone, email, notes }` — pre-loaded into seed.sql
- `painPoints` — array of strings — injected into PRD prompt
- `domainContext` — long-form paragraph — used in wizard summary sent to PRD stage

Wizard jobs use `wizardData.vertical` to look up the vertical. The vertical terminology is then injected into every downstream stage prompt.

---

## Theme System

`lib/themes.ts` exports `THEMES` and `getTheme(id)`.

Each theme has:
- `id`, `name`, `description`
- `previewColors` — array of Tailwind `bg-*` class names (shown as color dots in the wizard)
- `cssContext` — plain-English description of colors + Tailwind classes injected into the build prompt

---

## Storage: Auto-Detection

`lib/db.ts` exports async functions: `getJobs()`, `getJob(id)`, `saveJob(job)`, `updateJob(id, updates)`.

On every call:
- If `process.env.DATABASE_URL` is set → PostgreSQL via `pg.Pool`
- If not → file-based JSON at `.factory/jobs.json`

The `pg` module is `require()`-d dynamically only when PostgreSQL is active — it does not load during file-based operation.

**PostgreSQL schema** (`schema.sql`):
```sql
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

The entire `Job` object is stored as `JSONB` in the `data` column. No column-level schema changes are needed when new fields are added to the `Job` type.

---

## Deployment

Deployment uses the Vercel REST API (`POST https://api.vercel.com/v13/deployments`).
- Requires `VERCEL_TOKEN` env var. Without it, deploy stage returns `status: 'no_token'` and the factory still shows generated files.
- `job.liveUrl` is set on successful deploy; `job.deployResult` has the full deploy response.
- The deploy stage uploads all generated files from `job.buildOutput.files` directly to Vercel.

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
| `GEMINI_API_KEY` | YES | Google Gemini API key from aistudio.google.com |
| `DATABASE_URL` | NO | PostgreSQL connection string. Omit to use file storage. |
| `VERCEL_TOKEN` | NO | Vercel token for deploying generated platforms |

Add new env vars to `.env.local.example` when introducing them.

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
- **All db functions are async** — always `await` them

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
| 2026-06-21 | Gemini model names were wrong | Used `gemini-1.5-pro` etc. (invalid). Corrected to `gemini-2.0-flash`. |
| 2026-06-21 | Discovery agent repeated same question | `chat/route.ts` was double-appending user messages to context. Fixed by passing original `job` (not the updated chat) to `continueDiscovery`. |
| 2026-06-30 | Test + Deploy stages added | Pipeline: build → testing → (test_review if issues) → deploying → live. |
| 2026-06-30 | `gemini-2.0-flash` deprecated on owner's free-tier key | Switched all model mappings to `gemini-2.5-flash`. `gemini-2.0-flash-lite` also unavailable on this key. |
| 2026-06-30 | Gemini API calls failing from Node.js | This environment routes HTTPS through a proxy (`HTTPS_PROXY=http://127.0.0.1:41205`). The Gemini SDK respects this. Calls to `generativelanguage.googleapis.com` now succeed. |
| 2026-06-30 | Gemini API key format confusion | Owner's keys use `AQ.xxx` prefix (Google AI Studio format), not `AIzaSy...`. Both are valid with the SDK — the `AQ.` format is newer. |
| 2026-06-30 | Supabase rejected | Owner wants self-hosted PostgreSQL on Mac mini, not Supabase. `lib/db.ts` uses `DATABASE_URL` auto-detection instead. |
| 2026-06-30 | `db.ts` functions made async | Required for PostgreSQL backend. All 5 API route files updated to `await` all db calls. |
| 2026-06-30 | Vertical card selection barely visible | Changed from `bg-emerald-500/10` (faint) to `bg-emerald-950` + `border-2` + ✓ checkmark badge. |
| 2026-06-30 | Dashboard stuck on "Loading..." | Added `.catch(() => setLoading(false))` to the fetch chain. |

---

## Verification Checklist

When the factory is working correctly:

- [ ] Submit a wizard job → status is `prd`, `autoRun: true`
- [ ] PRD auto-runs → status becomes `prd_review`, all 3 tiers appear with prices and features
- [ ] Pick a tier → status moves to `architecture`
- [ ] Architecture auto-runs → status becomes `arch_review`
- [ ] Approve architecture → status moves to `tech_stack`, then `building` (auto-chain)
- [ ] Build completes → status moves to `testing`
- [ ] Code review runs → if clean, moves to `deploying`; if issues, shows `test_review`
- [ ] Deploy completes → status is `live`, reveal animation fires, `job.liveUrl` has Vercel URL
- [ ] Without `VERCEL_TOKEN`: deploy skips gracefully, status is `live` but no URL, setup checklist shown

---

## Context: Why This Exists

Full planning conversation documented at `/root/.claude/plans/has-some-thought-about-parallel-church.md`.

Summary of key decisions:
- Target market: SMBs (small service businesses) who can't afford custom software
- The factory is internal-only; the owner (operator) runs it for clients (agency model)
- First vertical: dry cleaning. Platform is generic — same codebase for all service businesses.
- All products are multi-tenant SaaS with row-level isolation
- Branding: business owner's name is prominent; platform name is subtle
- 3 tiers: Starter / Standard / Pro (scope-based, not UX variants)
- Self-hosted on Mac mini — full ownership, custom domain, no ongoing cloud costs

**IMPORTANT**: Before starting any new build or major change, re-read the plan file. Decisions captured there are authoritative.
