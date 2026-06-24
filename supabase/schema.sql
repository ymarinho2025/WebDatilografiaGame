-- Cartas para o Farol Online
-- Rode este SQL no Supabase em SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  seed text not null,
  phrase_order jsonb not null,
  critical_number integer not null check (critical_number between 1 and 6),
  status text not null default 'playing',
  created_at timestamptz not null default now()
);

create table if not exists public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references public.rooms(code) on delete cascade,
  player_id text not null,
  name text not null,
  progress double precision not null default 0,
  score integer not null default 0,
  lives integer not null default 3,
  phase_index integer not null default 0,
  status text not null default 'playing',
  updated_at timestamptz not null default now(),
  unique(room_code, player_id)
);

alter table public.rooms enable row level security;
alter table public.room_players enable row level security;

drop policy if exists "rooms public read" on public.rooms;
drop policy if exists "rooms public insert" on public.rooms;
drop policy if exists "players public read" on public.room_players;
drop policy if exists "players public insert" on public.room_players;
drop policy if exists "players public update" on public.room_players;

create policy "rooms public read"
on public.rooms for select
to anon, authenticated
using (true);

create policy "rooms public insert"
on public.rooms for insert
to anon, authenticated
with check (true);

create policy "players public read"
on public.room_players for select
to anon, authenticated
using (true);

create policy "players public insert"
on public.room_players for insert
to anon, authenticated
with check (true);

create policy "players public update"
on public.room_players for update
to anon, authenticated
using (true)
with check (true);

-- Ative Realtime nas tabelas.
-- Se aparecer erro dizendo que a tabela já está na publicação, ignore.
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_players;
