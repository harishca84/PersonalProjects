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
