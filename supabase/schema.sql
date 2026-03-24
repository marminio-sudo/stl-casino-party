-- ============================================================
-- St. Louis Casino Party — Supabase Schema
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- EVENTS table
-- One row per event / QR code you generate
create table events (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  event_date    date,
  starting_chips integer not null default 5000,
  chips_per_ticket integer not null default 250,
  is_fundraiser boolean not null default false,
  raffle_enabled boolean not null default true,
  leaderboard_visible boolean not null default false,
  is_active     boolean not null default true,
  gameplay_mode text default 'normal' check (gameplay_mode in ('tight', 'normal', 'loose')),
  ticket_cap    integer,
  created_at    timestamptz default now()
);

-- GUESTS table
-- One row per guest check-in per event
create table guests (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid references events(id) on delete cascade,
  name          text not null,
  phone         text not null,
  starting_chips integer not null,
  extra_chips   integer not null default 0,
  final_chips   integer,
  dealer_confirmed boolean not null default false,
  confirmed_at  timestamptz,
  tally_submitted boolean not null default false,
  created_at    timestamptz default now()
);

-- BUYINS table
-- One row per chip purchase (Square payment)
create table buyins (
  id            uuid primary key default gen_random_uuid(),
  guest_id      uuid references guests(id) on delete cascade,
  event_id      uuid references events(id) on delete cascade,
  chips         integer not null,
  amount_cents  integer not null,
  square_payment_id text,
  created_at    timestamptz default now()
);

-- PRIZES table
-- Prizes for a given event's raffle
create table prizes (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid references events(id) on delete cascade,
  name          text not null,
  winner_guest_id uuid references guests(id),
  drawn_at      timestamptz,
  created_at    timestamptz default now()
);

-- ============================================================
-- VIEWS
-- ============================================================

-- Guest leaderboard with ticket counts
create or replace view guest_leaderboard as
select
  g.id,
  g.event_id,
  g.name,
  g.phone,
  g.starting_chips,
  g.extra_chips,
  coalesce(g.final_chips, g.starting_chips + g.extra_chips) as total_chips,
  g.dealer_confirmed,
  g.tally_submitted,
  e.chips_per_ticket,
  ceil(coalesce(g.final_chips, g.starting_chips + g.extra_chips)::numeric / e.chips_per_ticket) as ticket_count,
  g.created_at
from guests g
join events e on e.id = g.event_id
order by total_chips desc;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table events  enable row level security;
alter table guests  enable row level security;
alter table buyins  enable row level security;
alter table prizes  enable row level security;

-- Allow all reads on events (guests need to load event config)
create policy "events_read" on events for select using (true);

-- Allow guests to insert themselves
create policy "guests_insert" on guests for insert with check (true);

-- Allow guests to read their own record by id
create policy "guests_read_own" on guests for select using (true);

-- Allow guests to update their own record (used by dealer confirm flow)
create policy "guests_update" on guests for update using (true);

-- Buyins: insert + read freely (Square confirms authenticity)
create policy "buyins_insert" on buyins for insert with check (true);
create policy "buyins_read"   on buyins for select using (true);

-- Prizes: full access (admin-driven)
create policy "prizes_all" on prizes for all using (true);

-- ============================================================
-- REALTIME
-- Enable real-time on guests so admin dashboard auto-refreshes
-- ============================================================

-- Run in Supabase dashboard: Database > Replication > enable guests table
-- (Can't enable via SQL, must use dashboard toggle)

-- ============================================================
-- SAMPLE EVENT (optional, delete before production)
-- ============================================================

insert into events (name, event_date, starting_chips, chips_per_ticket, is_fundraiser, raffle_enabled)
values ('Fundraiser Gala', current_date, 5000, 250, true, true);
