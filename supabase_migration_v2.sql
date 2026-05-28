-- Migration v2: update properties table for underwriting app
-- Run in Supabase SQL Editor

-- Update property_type enum values
alter table properties
  drop constraint if exists properties_property_type_check;

alter table properties
  add constraint properties_property_type_check
  check (property_type in ('duplex','fourplex','small_multifamily','single_family','other'));

-- Update status enum values
alter table properties
  drop constraint if exists properties_status_check;

alter table properties
  add constraint properties_status_check
  check (status in ('analyzing','watching','passed','researching','rejected'));

-- Add new columns (safe: IF NOT EXISTS)
alter table properties
  add column if not exists num_units               integer       not null default 1,
  add column if not exists vintage_year            integer,
  add column if not exists asset_class             text          not null default 'B',
  add column if not exists loan_to_value           numeric(5,4)  not null default 0.75,
  add column if not exists renovation_cost         numeric(12,2) not null default 0,
  add column if not exists closing_costs           numeric(12,2) not null default 0,
  add column if not exists vacancy_rate            numeric(5,4)  not null default 0.05,
  add column if not exists annual_taxes            numeric(10,2) not null default 0,
  add column if not exists annual_insurance        numeric(10,2) not null default 0,
  add column if not exists annual_repairs          numeric(10,2) not null default 0,
  add column if not exists annual_property_management numeric(10,2) not null default 0,
  add column if not exists annual_capex_reserve    numeric(10,2) not null default 0,
  add column if not exists rent_confidence         text          not null default 'medium',
  add column if not exists expense_confidence      text          not null default 'medium',
  add column if not exists location_risk           text          not null default 'medium',
  add column if not exists property_condition_risk text          not null default 'medium',
  add column if not exists hold_period_years       integer       not null default 7;

-- Rename price → purchase_price (keep price as alias via view if needed)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'properties' and column_name = 'price'
  ) then
    alter table properties rename column price to purchase_price;
  end if;
end $$;

-- Add constraints for confidence/risk levels
alter table properties
  drop constraint if exists properties_rent_confidence_check,
  drop constraint if exists properties_expense_confidence_check,
  drop constraint if exists properties_location_risk_check,
  drop constraint if exists properties_property_condition_risk_check;

alter table properties
  add constraint properties_rent_confidence_check
    check (rent_confidence in ('low','medium','high')),
  add constraint properties_expense_confidence_check
    check (expense_confidence in ('low','medium','high')),
  add constraint properties_location_risk_check
    check (location_risk in ('low','medium','high')),
  add constraint properties_property_condition_risk_check
    check (property_condition_risk in ('low','medium','high'));
