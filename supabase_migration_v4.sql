-- Migration v4: simplified schema for streamlined underwriting model
-- Run in Supabase SQL Editor

alter table properties
  add column if not exists asking_price    numeric(12,2),
  add column if not exists sqft            integer,
  add column if not exists neighborhood    text,
  add column if not exists broker          text,
  add column if not exists unit_config     text,
  add column if not exists annual_expenses numeric(12,2) default 0;

-- Backfill asking_price from purchase_price for existing rows
update properties set asking_price = purchase_price where asking_price is null;

-- Backfill annual_expenses from the sum of the old individual expense columns
update properties
set annual_expenses = coalesce(annual_taxes, 0)
                    + coalesce(annual_insurance, 0)
                    + coalesce(annual_repairs, 0)
                    + coalesce(annual_property_management, 0)
                    + coalesce(annual_capex_reserve, 0)
where annual_expenses is null or annual_expenses = 0;
