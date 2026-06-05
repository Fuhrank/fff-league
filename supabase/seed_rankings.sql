-- Refresh team list + title odds for 2026 World Cup.
-- Source: ESPN futures (June 5, 2026). American odds shown in comments; stored as decimal.
-- Decimal = (American/100) + 1, so display layer converts back to American.
-- Re-run any time to refresh.

alter table teams add column if not exists fifa_rank   int;
alter table teams add column if not exists title_odds  numeric;

-- 1. Add the 8 qualifiers missing from the original seed.
insert into teams (id, name, flag_emoji) values
  ('SWE','Sweden','🇸🇪'),
  ('BIH','Bosnia & Herzegovina','🇧🇦'),
  ('IRQ','Iraq','🇮🇶'),
  ('COD','DR Congo','🇨🇩'),
  ('CPV','Cape Verde','🇨🇻'),
  ('CUW','Curaçao','🇨🇼'),
  ('HAI','Haiti','🇭🇹'),
  ('PAN','Panama','🇵🇦')
on conflict (id) do nothing;

-- 2. Drop teams that did not qualify.
delete from teams where id in ('ITA','VEN','WAL','POL','NGA','CMR','UKR','DEN');

-- 3. Update odds + ESPN rank for all 48 qualifiers.
update teams set fifa_rank = data.r, title_odds = data.o from (values
  ('ESP',  1,    5.20),  -- +420
  ('FRA',  2,    5.60),  -- +460
  ('ENG',  3,    7.50),  -- +650
  ('BRA',  4,    9.50),  -- +850
  ('POR',  5,   11.00),  -- +1000
  ('ARG',  6,   11.00),  -- +1000
  ('GER',  7,   14.00),  -- +1300
  ('NED',  8,   17.00),  -- +1600
  ('BEL',  9,   23.00),  -- +2200
  ('NOR', 10,   36.00),  -- +3500
  ('COL', 11,   41.00),  -- +4000
  ('JPN', 12,   46.00),  -- +4500
  ('MAR', 13,   51.00),  -- +5000
  ('USA', 14,   61.00),  -- +6000
  ('URY', 15,   61.00),  -- +6000
  ('MEX', 16,   66.00),  -- +6500
  ('SUI', 17,   66.00),  -- +6500
  ('CRO', 18,   71.00),  -- +7000
  ('TUR', 19,   81.00),  -- +8000
  ('ECU', 20,  101.00),  -- +10000
  ('SEN', 21,  126.00),  -- +12500
  ('AUT', 22,  126.00),  -- +12500
  ('CAN', 23,  176.00),  -- +17500
  ('SWE', 24,  176.00),  -- +17500
  ('CIV', 25,  176.00),  -- +17500
  ('PAR', 26,  201.00),  -- +20000
  ('EGY', 27,  251.00),  -- +25000
  ('SCO', 28,  301.00),  -- +30000
  ('BIH', 29,  301.00),  -- +30000
  ('CZE', 30,  301.00),  -- +30000
  ('ALG', 31,  401.00),  -- +40000
  ('KOR', 32,  501.00),  -- +50000
  ('GHA', 33,  501.00),  -- +50000
  ('TUN', 34,  501.00),  -- +50000
  ('IRN', 35,  501.00),  -- +50000
  ('AUS', 36,  601.00),  -- +60000
  ('QAT', 37,  751.00),  -- +75000
  ('KSA', 38,  751.00),  -- +75000
  ('PAN', 39, 1001.00),  -- +100000
  ('NZL', 40, 1001.00),  -- +100000
  ('RSA', 41, 1251.00),  -- +125000
  ('UZB', 42, 1501.00),  -- +150000
  ('IRQ', 43, 1501.00),  -- +150000
  ('JOR', 44, 1501.00),  -- +150000
  ('COD', 45, 2001.00),  -- +200000
  ('CPV', 46, 2501.00),  -- +250000
  ('CUW', 47, 2501.00),  -- +250000
  ('HAI', 48, 2501.00)   -- +250000
) as data(id, r, o) where teams.id = data.id;
