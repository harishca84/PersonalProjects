# AI Factory

An AI-powered job runner that takes a service business problem and builds a deployed, working SaaS platform for it — automatically.

Submit a job ("I run a dry cleaning shop"), have a discovery conversation, pick a tier (Starter / Standard / Pro), approve the architecture, and the factory generates and deploys the product.

---

## What This Is

The factory is the **engine**. The product it builds (a service business management platform) is the **output**.

```
You describe a business
        ↓
Factory runs a pipeline of AI stages
        ↓
A working, deployed SaaS platform appears
```

The factory is not a generic code generator. It understands service businesses specifically — businesses that receive customer items, process them over time, notify customers, and return them (dry cleaning, shoe repair, tailoring, watch repair, auto detailing, etc.).

---

## Two-Product Structure

```
┌─────────────────────────────────────────────┐
│  AI FACTORY (this app)                      │
│  Internal engine, operator-facing           │
│  Runs on the operator's machine             │
└──────────────────────┬──────────────────────┘
                       │ produces
                       ▼
┌─────────────────────────────────────────────┐
│  SERVICE BUSINESS PLATFORM (the output)     │
│  Multi-tenant SaaS                          │
│  Sold to SMBs (dry cleaners, tailors, etc.) │
│  Business brand front, platform brand subtle│
└─────────────────────────────────────────────┘
```

---

## Pipeline Stages

| # | Stage | What Happens | Model | Human Checkpoint? |
|---|---|---|---|---|
| 1 | **Discovery** | Conversational interview with the business owner | claude-sonnet-4-6 | No — conversational |
| 2 | **PRD** | Generates Starter / Standard / Pro feature breakdown | claude-opus-4-8 | YES — owner picks tier |
| 3 | **Architecture** | System design: components, data models, API shape | claude-opus-4-8 | YES — approve or adjust |
| 4 | **Tech Stack** | Factory selects the best-fit stack for this product | claude-sonnet-4-6 | Only if ambiguous |
| 5 | **Build** | Generates all code files, committed to GitHub | claude-sonnet-4-6 | No — automated |
| 6 | **Test** | Writes and runs automated tests | claude-sonnet-4-6 | Only if tests fail |
| 7 | **Deploy** | Pushes to cloud, produces live URL | deployment MCP | No — automated |
| 8 | **Monitor** | Health checks, usage summaries, anomaly detection | claude-haiku-4-5 | As needed |
| 9 | **Evolve** | Proposes feature improvements from usage data | claude-opus-4-8 | YES — all evolutions |

---

## Service Business Platform: What Gets Built

Every product the factory produces is a **multi-tenant SaaS** with:
- Order/ticket management with configurable workflow stages
- Customer database
- Configurable item types and pricing
- SMS/WhatsApp customer notifications
- Analytics dashboard
- Staff management
- Multi-channel UI (web, tablet, WhatsApp, mobile)

### 3 Tiers

| Tier | Features | Target |
|---|---|---|
| Starter | Order management + basic pricing/invoicing | "Get off paper" |
| Standard | + SMS notifications + analytics dashboard | Most popular |
| Pro | + Advanced analytics + multi-location + WhatsApp + custom branding | Multi-site operators |

### Vertical Configurations

The platform is generic. Each business type gets a configuration:

```json
{
  "business_type": "dry_cleaning",
  "workflow_stages": ["received", "spotting", "cleaning", "pressing", "finishing", "ready", "picked_up"],
  "item_types": [
    { "name": "Shirt", "price": 4.50 },
    { "name": "Suit (2pc)", "price": 18.00 }
  ],
  "notification_templates": {
    "ready": "Hi {name}, your {item_count} item(s) at {business_name} are ready for pickup!"
  }
}
```

Same platform, different config for dry cleaning vs. shoe repair vs. tailoring.

---

## Getting Started

### Prerequisites

- Node.js 18+
- Anthropic API key ([get one here](https://console.anthropic.com/settings/keys))

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.local.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY

# 3. Start the factory
npm run dev
```

Open `http://localhost:3000` — it redirects to the dashboard.

### Running Your First Job

1. Click **New Job** on the dashboard
2. Enter the business name and type (e.g., "Joe's Cleaners" / "Dry Cleaning")
3. Have the discovery conversation — answer the factory's questions as the business owner would
4. Once discovery is complete, click **Generate PRD**
5. Review the 3-tier breakdown and pick your tier
6. Approve the architecture
7. Factory builds the product

Job state and all stage outputs are stored in `.factory/jobs.json` locally.

---

## Tech Stack (Factory App)

| Layer | Technology | Reason |
|---|---|---|
| Framework | Next.js 16 (App Router) | Single codebase, minimal ops overhead |
| Language | TypeScript | Type safety across pipeline stages |
| AI | Anthropic API (`@anthropic-ai/sdk`) | Claude models for all stages |
| Storage | File-based (`.factory/jobs.json`) | Zero setup, easy to inspect |
| Styling | Tailwind CSS | Rapid UI iteration |
| Deployment | Vercel (recommended) | Zero-config Next.js deployment |

---

## Project Structure

```
factory-app/
├── app/
│   ├── api/
│   │   └── jobs/
│   │       ├── route.ts              # GET list, POST create job
│   │       └── [id]/
│   │           ├── route.ts          # GET single job
│   │           ├── chat/route.ts     # POST discovery message
│   │           ├── stage/route.ts    # POST trigger next pipeline stage
│   │           └── approve/route.ts  # POST HITL approval
│   ├── dashboard/page.tsx            # Job list
│   ├── jobs/
│   │   ├── new/page.tsx              # Job creation form
│   │   └── [id]/page.tsx            # Job detail + pipeline view
│   └── layout.tsx
├── lib/
│   ├── claude.ts                     # Anthropic API wrapper (model selection)
│   ├── db.ts                         # File-based job storage
│   └── stages/
│       ├── discovery.ts              # Discovery conversation + summary
│       ├── prd.ts                    # PRD generation (3 tiers)
│       ├── architecture.ts           # System design generation
│       ├── tech-stack.ts             # Tech stack selection
│       └── build.ts                  # Code generation
├── types/
│   └── factory.ts                    # All TypeScript types
└── .factory/
    └── jobs.json                     # Runtime job state (auto-created)
```

---

## Key Design Decisions

All decisions below were made deliberately and documented. Re-open only with clear reason.

| Decision | Choice | Reason |
|---|---|---|
| Factory access model | Internal only — operator runs it for clients | Agency model; quality = operator's product quality |
| Platform architecture | Multi-tenant SaaS | Single codebase, row-level tenant isolation |
| New vertical growth | AI proposes + human approves + auto-learns from usage | Knowledge compounds with every onboarded business |
| Product tech stack | Factory decides per job | No hardcoded stack; products can vary |
| Factory storage | File-based JSON | Zero friction, easy to debug, no DB setup |
| Model assignment | Opus for PRD/Architecture/Evolve; Sonnet for rest; Haiku for Monitor | Depth where it matters, cost control everywhere else |
| Branding | Business name front, platform name subtle | "Joe's Dry Cleaning, powered by [Platform]" |

---

## Status Log

| Date | Event |
|---|---|
| 2026-06-20 | Factory app built and committed (`599b8bf`) |
| 2026-06-21 | Fixed missing `types/factory.ts` — root cause of "page not found" error (`7704b42`) |
| 2026-06-21 | App confirmed running and returning 200 on `/dashboard` |

---

## Roadmap

- [ ] Test stage (automated test generation + execution)
- [ ] Deploy stage (Vercel MCP integration, live URL output)
- [ ] Monitor stage (health checks, error rate tracking)
- [ ] Evolve stage (usage-driven feature proposals)
- [ ] Vertical config system (templates for known business types)
- [ ] First factory run: dry cleaning platform end-to-end
- [ ] Living Product: proactive suggestions from usage data
