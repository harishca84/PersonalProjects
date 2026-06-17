# Expensify

A small expense-splitting app for friend groups and trips: sign up, create
groups, invite friends by email, log shared expenses, record settle-up
payments, and see simplified "who owes whom" balances.

## Stack

- `server/`: Node.js + Express API backed by SQLite (`better-sqlite3`),
  with JWT-in-cookie session auth (`bcryptjs` + `jsonwebtoken`)
- `client/`: React + Vite single-page app

## Running locally

In one terminal:

```sh
cd server
npm install
npm run dev   # http://localhost:4000
```

In another terminal:

```sh
cd client
npm install
npm run dev   # http://localhost:5173, proxies /api to the server
```

Open http://localhost:5173, sign up for an account, and create a group.
To add a friend to a group they must already have an Expensify account
(add them by the email they signed up with).

Optionally set `JWT_SECRET` (server) and `CLIENT_ORIGIN` (server, for CORS)
in your environment for anything beyond local dev.

## API overview

- `POST /api/auth/signup` / `POST /api/auth/login` / `POST /api/auth/logout`
  / `GET /api/auth/me` — account creation and session management (httpOnly
  cookie)
- `GET /api/users?email=` — look up an account by exact email (used to add
  members to a group)
- `GET/POST /api/groups` — list the current user's groups / create a group
  (creator is added as a member automatically)
- `GET /api/groups/:id` — group details with members
- `POST /api/groups/:id/members` — add an existing user to a group by email
- `GET/POST /api/groups/:id/expenses` — list/add expenses (with per-person
  splits)
- `PUT /api/expenses/:id` / `DELETE /api/expenses/:id` — edit or remove an
  expense
- `GET/POST /api/groups/:id/payments` — list/record settle-up payments
  between members
- `GET /api/groups/:id/balances` — net balance per person (expenses +
  payments) and a simplified list of settlements (minimum number of
  payments to settle the group up)

All `/api` routes except `/api/auth/*` require an authenticated session,
and group-scoped routes require the caller to be a member of that group.

## Deploying to Vercel + Supabase

The API and frontend are deployed as two separate Vercel projects, both
backed by the same Supabase Postgres database.

### Prerequisites

- A [Supabase](https://supabase.com) project — grab the Postgres connection
  string from **Project Settings → Database → URI**.
- A [Vercel](https://vercel.com) account connected to this GitHub repo.

### 1 — Deploy the API

1. In Vercel: **Add New Project**, import `harishca84/PersonalProjects`.
2. Set **Root Directory** to `expensify/server`.
3. Vercel auto-detects the `vercel.json` and treats `api/index.js` as the
   serverless entry point (no build command needed).
4. Add these environment variables:
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | your Supabase connection string |
   | `JWT_SECRET` | any long random string |
   | `CLIENT_ORIGIN` | *(leave blank for now, fill in after step 2)* |
5. Deploy. Note the URL Vercel assigns (e.g. `expensify-server.vercel.app`).

### 2 — Deploy the frontend

1. **Add New Project** again, same repo.
2. Set **Root Directory** to `expensify/client`.
3. Vercel auto-detects Vite. Set **Build Command** to `npm run build` and
   **Output Directory** to `dist` (usually pre-filled).
4. Add this environment variable:
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | the API URL from step 1 (e.g. `https://expensify-server.vercel.app`) |
5. Deploy. Note the frontend URL (e.g. `expensify-client.vercel.app`).

### 3 — Wire the two together

Go back to the **API project** in Vercel, set `CLIENT_ORIGIN` to the
frontend URL from step 2, then **Redeploy** the API. Both services now
point at each other and share the Supabase database.

> **Note:** the Expensify API Express app is deployed as a single Vercel
> serverless function. Vercel's free Hobby plan allows up to **10 seconds**
> per invocation — more than enough for all routes here. Schema migrations
> run automatically on the first cold start against the Supabase DB.
