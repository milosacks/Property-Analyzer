-- Migration v3: add Zillow URL field
-- Run in Supabase SQL Editor

alter table properties
  add column if not exists zillow_url text;
