-- FFF League: add group_no to players (Group 1 = original 11-12 owners, Group 2 = the 8-owner side league)
-- Run this in Supabase SQL Editor.

alter table players
  add column if not exists group_no int not null default 1;

-- Sanity: keep it to 1 or 2.
do $$ begin
  alter table players add constraint players_group_no_chk check (group_no in (1, 2));
exception when duplicate_object then null; end $$;
