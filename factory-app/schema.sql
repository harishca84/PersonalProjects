-- AI Factory — PostgreSQL schema
-- Run this once after installing PostgreSQL on your Mac mini:
--   psql -U postgres -d factory -f schema.sql

CREATE TABLE IF NOT EXISTS jobs (
  id          TEXT        PRIMARY KEY,
  data        JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS jobs_created_at_idx ON jobs (created_at DESC);
