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

## Deploying to Render

A Render Blueprint (`../render.yaml` at the repo root) defines two services:

- `expensify-api`: Node web service running the Express API
- `expensify-client`: static site serving the Vite build, configured with
  `VITE_API_URL` pointing at the API service

To deploy:

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. In the Render dashboard, **New > Blueprint**, connect the GitHub repo, and
   Render will pick up `render.yaml` and create both services.
3. After the first deploy, the API and client get real `*.onrender.com`
   URLs. Update the `CLIENT_ORIGIN` env var on `expensify-api` and the
   `VITE_API_URL` env var on `expensify-client` to match the actual URLs
   Render assigned (the blueprint guesses the default name-based URLs, which
   is usually right, but double-check), then trigger a redeploy.

**Data persistence caveat:** the API stores data in a SQLite file on local
disk. Render's free web service plan has an ephemeral filesystem — the
database resets on every deploy and on restarts after the service spins
down from inactivity. For data that needs to persist, upgrade the API
service to a paid plan with a persistent disk mounted at `server/data`, or
swap SQLite for a hosted Postgres database.
