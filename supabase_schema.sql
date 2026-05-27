-- Run this in the Supabase SQL Editor

create table if not exists properties (
  id              uuid primary key default gen_random_uuid(),
  address         text not null,
  city            text not null,
  state           text not null,
  zip_code        text not null,
  property_type   text not null default 'single_family'
                    check (property_type in ('single_family','multi_family','condo','commercial','land')),
  price           numeric(12,2) not null,
  bedrooms        integer,
  bathrooms       numeric(4,1),
  sqft            integer,
  status          text not null default 'watching'
                    check (status in ('watching','active','under_contract','closed','rejected')),
  notes           text,
  -- financials
  monthly_rent      numeric(10,2),
  monthly_expenses  numeric(10,2),
  mortgage_payment  numeric(10,2),
  down_payment      numeric(12,2),
  interest_rate     numeric(5,3),
  loan_term_years   integer,
  -- timestamps
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists transactions (
  id                uuid primary key default gen_random_uuid(),
  property_id       uuid not null references properties(id) on delete cascade,
  transaction_type  text not null check (transaction_type in ('purchase','sale')),
  price             numeric(12,2) not null,
  transaction_date  date not null,
  notes             text,
  created_at        timestamptz not null default now()
);

-- Auto-update updated_at on properties
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists properties_updated_at on properties;
create trigger properties_updated_at
  before update on properties
  for each row execute function set_updated_at();

-- Enable Row Level Security (adjust policies to your auth setup)
alter table properties  enable row level security;
alter table transactions enable row level security;

-- Permissive policies for service-role key (backend uses this key)
-- If you add user auth later, replace with user-scoped policies.
create policy "service role full access on properties"
  on properties for all using (true);

create policy "service role full access on transactions"
  on transactions for all using (true);
