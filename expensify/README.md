# Expensify

A small expense-splitting app for friend groups and trips: add friends, create
groups, log shared expenses, and see simplified "who owes whom" balances.

## Stack

- `server/`: Node.js + Express API backed by SQLite (`better-sqlite3`)
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

Open http://localhost:5173.

## API overview

- `GET/POST /api/people` — list/add friends
- `GET/POST /api/groups` — list/create groups (with member ids)
- `GET /api/groups/:id` — group details with members
- `POST /api/groups/:id/members` — add an existing friend to a group
- `GET/POST /api/groups/:id/expenses` — list/add expenses (with per-person splits)
- `DELETE /api/expenses/:id` — remove an expense
- `GET /api/groups/:id/balances` — net balance per person and a simplified
  list of settlements (minimum number of payments to settle the group up)
