-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Stores the whole site content as a single JSONB row.

create table if not exists public.site_content (
  id integer primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Lock the table down. All app access goes through the server with the
-- service-role key, which bypasses RLS — so no public policies are needed.
alter table public.site_content enable row level security;

-- The private Storage bucket "assets" is created by scripts/seed-supabase.mjs.
-- Keep it private: images are only served through the app's /api/asset proxy.
