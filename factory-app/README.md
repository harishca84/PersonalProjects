# AI Factory

An AI-powered platform builder for service businesses. Describe a business, run a 4-step wizard, and the factory produces a fully-coded, production-grade SaaS platform — with domain vocabulary, pre-loaded sample data, and the right design theme baked in.

---

## What This Is

The factory is the **engine**. The service business platform it builds is the **product**.

```
You pick a vertical (dry cleaning, shoe repair, tailoring...)
        ↓
4-step wizard: vertical → business details → design theme → review
        ↓
Factory auto-runs: PRD → Architecture → Tech Stack → Build → Test → Deploy
        ↓
A working, deployed SaaS platform appears
```

The factory is not a generic code generator. It understands the language of each business type. A dry cleaner's platform uses "tickets" and "garments". A tailor's platform uses "alterations" and "clients". The sample data arrives pre-loaded. The correct workflow stages are wired in from day one.

---

## Two-Product Structure

```
┌─────────────────────────────────────────────┐
│  AI FACTORY (this repo)                     │
│  Internal engine — operator-facing          │
│  Hosted on your own server (Mac mini)       │
└──────────────────────┬──────────────────────┘
                       │ produces
                       ▼
┌─────────────────────────────────────────────┐
│  SERVICE BUSINESS PLATFORM (the output)     │
│  Multi-tenant SaaS sold to SMBs             │
│  Dry cleaners, tailors, shoe repairers...   │
│  Business brand front, platform brand subtle│
└─────────────────────────────────────────────┘
```

---

## Supported Verticals

| Vertical | Domain Term | Workflow Stages | Sample Services |
|---|---|---|---|
| 🧺 Dry Cleaning | "ticket" / "garment" | Received → Spotting → Cleaning → Pressing → Ready | Shirts, suits, dresses |
| 👟 Shoe Repair | "job" / "pair" | Received → Assessment → In Repair → Quality Check → Ready | Heel replacement, sole repair |
| ✂️ Tailoring & Alterations | "alteration" / "garment" | Fitting → Pinned & Ready → Sewing → Final Press → Ready | Hemming, zipper, resize |
| ⌚ Watch & Jewelry Repair | "repair order" / "piece" | Received → Diagnosis → Quote Sent → In Repair → Testing → Ready | Battery, strap, mechanism |
| 🚗 Auto Detailing | "detail job" / "vehicle" | Booked → Vehicle Arrived → Wash → Interior Detail → Final Polish → Ready | Full detail, ceramic coat |

Each vertical includes pre-configured:
- Domain vocabulary used throughout the generated UI and code
- Workflow stages wired into the platform
- Sample customers (with names, phones, emails)
- Default services with base pricing
- Known pain points used to shape the PRD

---

## Design Themes

| Theme | Palette | Best For |
|---|---|---|
| Dark Professional | Black, gray, emerald | Counter staff — easy on eyes for long shifts |
| Light & Clean | White, slate, blue | Well-lit shop fronts and offices |
| Warm & Earthy | Cream, brown, amber | Neighbourhood shops and boutiques |
| Modern Minimal | White, black, red | Bold, zero-clutter aesthetic |

---

## Pipeline Stages

The factory runs automatically after wizard submission. Human checkpoints are marked:

| # | Stage | What Happens | Human? |
|---|---|---|---|
| 1 | **PRD** | Generates Starter / Standard / Pro feature breakdown using vertical knowledge | ✅ Pick tier |
| 2 | **Architecture** | System design: data models, API shape, integrations | ✅ Approve |
| 3 | **Tech Stack** | Factory selects the best-fit stack for the product | Auto |
| 4 | **Build** | Generates all code files with domain vocabulary + sample data + theme | Auto |
| 5 | **Test** | Reviews generated code for critical issues | ✅ Only if issues found |
| 6 | **Deploy** | Pushes to Vercel, produces live URL | Auto |

### 3 Tiers (Generated per Job)

| Tier | Typical Price | Scope |
|---|---|---|
| Starter | $49–79/mo | Order tracking + basic invoicing. "Get off paper." |
| Standard | $89–129/mo | + SMS notifications + analytics dashboard |
| Pro | $149–249/mo | + Advanced analytics + multi-location + custom branding |

---

## Getting Started (Local Dev)

### Prerequisites

- Node.js 18+
- Gemini API key — free at [aistudio.google.com](https://aistudio.google.com/app/apikey)

### Setup

```bash
git clone https://github.com/harishca84/personalprojects
cd personalprojects/factory-app
git checkout claude/ai-workforce-software-dev-q72s4u

npm install
cp .env.local.example .env.local
# Add your GEMINI_API_KEY to .env.local

npm run dev
```

Open `http://localhost:3000` — it redirects to the dashboard.

### Running Your First Job

1. Click **+ New Job**
2. **Step 1** — Pick a vertical (Dry Cleaning, Shoe Repair, etc.)
3. **Step 2** — Enter business name, owner name, location, staff size, daily volume
4. **Step 3** — Choose a design theme
5. **Step 4** — Review the summary and click **Build**
6. Factory auto-runs — watch the pipeline progress
7. Pick a tier when the PRD is ready, approve architecture, then watch the build complete
8. Reveal animation fires when the platform goes live

---

## Self-Hosting on Mac Mini

The factory is designed to run on your own machine. File-based storage (`.factory/jobs.json`) works fine — it's a persistent process, not serverless.

### 1. Install dependencies on the Mac mini

```bash
brew install node nginx
npm install -g pm2
```

### 2. Clone, configure, and build

```bash
git clone https://github.com/harishca84/personalprojects
cd personalprojects/factory-app
npm install
npm run build
echo "GEMINI_API_KEY=your-key-here" > .env.local
```

### 3. Start with PM2 (auto-restart on reboot)

```bash
pm2 start npm --name "factory" -- start
pm2 save && pm2 startup
```

### 4. Nginx reverse proxy

Edit `/opt/homebrew/etc/nginx/nginx.conf`, replace the `server { }` block:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
brew services start nginx
```

### 5. Free SSL certificate

```bash
brew install certbot
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 6. Point your domain

**Option A — Direct IP** (requires static home IP + router port forwarding on 80/443):
- Domain registrar → DNS → `A` record → your home public IP

**Option B — Cloudflare Tunnel** (recommended — no port forwarding, survives IP changes):

```bash
brew install cloudflared
cloudflared tunnel login
cloudflared tunnel create factory
cloudflared tunnel route dns factory yourdomain.com
pm2 start "cloudflared tunnel run --url http://localhost:3000 factory" --name tunnel
pm2 save
```

---

## Switching to PostgreSQL (When Mac Mini Arrives)

The factory auto-detects `DATABASE_URL`. Without it, uses file storage. With it, uses PostgreSQL. No code changes needed.

### Setup

```bash
brew install postgresql@16
brew services start postgresql@16
createdb factory
psql -d factory -f schema.sql
```

Add to `.env.local`:
```
DATABASE_URL=postgresql://postgres@localhost:5432/factory
```

Restart the app — it switches automatically.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | From [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| `DATABASE_URL` | No | PostgreSQL connection string. Omit to use file storage. |
| `VERCEL_TOKEN` | No | For auto-deploying generated platforms to Vercel. |

---

## Project Structure

```
factory-app/
├── app/
│   ├── api/jobs/
│   │   ├── route.ts              # GET list, POST create job
│   │   └── [id]/
│   │       ├── route.ts          # GET single job
│   │       ├── chat/route.ts     # POST discovery message
│   │       ├── stage/route.ts    # POST trigger next pipeline stage
│   │       └── approve/route.ts  # POST HITL approval
│   ├── dashboard/page.tsx        # Job list
│   └── jobs/
│       ├── new/page.tsx          # 4-step wizard
│       └── [id]/page.tsx         # Job detail + pipeline view
├── lib/
│   ├── claude.ts                 # Gemini API wrapper
│   ├── db.ts                     # Auto-selects file or PostgreSQL
│   ├── verticals.ts              # 5 vertical configurations
│   ├── themes.ts                 # 4 design themes
│   └── stages/
│       ├── discovery.ts          # Discovery conversation
│       ├── prd.ts                # PRD generation (3 tiers)
│       ├── architecture.ts       # System design
│       ├── tech-stack.ts         # Stack selection
│       ├── build.ts              # Code generation
│       ├── test.ts               # Code review
│       └── deploy.ts             # Vercel deployment
├── types/factory.ts              # All TypeScript types
├── schema.sql                    # PostgreSQL schema (run once on Mac mini)
└── .factory/jobs.json            # Runtime job state (auto-created, file mode only)
```

---

## Key Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Target market | SMBs — dry cleaners, tailors, shoe repairers | Can't afford custom software; massive underserved market |
| Factory access | Internal only — operator runs for clients | Agency model; factory quality = operator's reputation |
| AI backend | Google Gemini (`gemini-2.5-flash`) | Free tier available; same API surface regardless of model |
| Storage | File-based dev → PostgreSQL prod | Zero friction locally; proper DB when self-hosted |
| Hosting | Self-hosted on Mac mini | Full ownership, no ongoing cloud costs, custom domain |
| Domain vocab | Injected per vertical into every AI prompt | Generated code uses "tickets" not "orders" for dry cleaners |
| Sample data | Pre-loaded per vertical in seed.sql | Platforms arrive with real-looking data, not blank screens |
| Themes | 4 pre-built, injected into build prompt | Visual differentiation without post-generation styling work |
| Pipeline | Auto-runs after wizard; human pauses at PRD + Architecture | Reduces friction without removing oversight |

---

## Status Log

| Date | Event |
|---|---|
| 2026-06-20 | Factory app created and first commit pushed |
| 2026-06-21 | Fixed missing `types/factory.ts` — root cause of "page not found" |
| 2026-06-21 | Switched AI from Anthropic to Google Gemini (free tier) |
| 2026-06-21 | Fixed Gemini history constraint (must start with `user` role) |
| 2026-06-21 | Fixed discovery agent repeating questions |
| 2026-06-30 | Added Test + Deploy pipeline stages |
| 2026-06-30 | Added 5 vertical configurations (`lib/verticals.ts`) |
| 2026-06-30 | Added 4 design themes (`lib/themes.ts`) |
| 2026-06-30 | Rewrote job creation as 4-step wizard |
| 2026-06-30 | Added auto-run pipeline (wizard jobs skip manual triggers) |
| 2026-06-30 | Added reveal animation + setup checklist on job completion |
| 2026-06-30 | Fixed: `gemini-2.0-flash` deprecated on free tier → switched to `gemini-2.5-flash` |
| 2026-06-30 | Added PostgreSQL support with file-based fallback (`DATABASE_URL` auto-detect) |
| 2026-06-30 | Added Mac mini self-hosting guide (Nginx + PM2 + Certbot + Cloudflare Tunnel) |

---

## Roadmap

- [ ] Monitor stage — health checks, error rate tracking, usage summaries
- [ ] Evolve stage — usage-driven feature proposals, AI-suggested improvements
- [ ] Vertical config system — auto-learn templates from completed jobs
- [ ] Voice discovery — mic input for business owners who prefer talking
- [ ] Live build feed — stream code generation progress in real time
- [ ] Change request flow — post-deploy iterative editing ("add a rush service")
- [ ] Weekly automation digest — "your platform worked while you slept"
