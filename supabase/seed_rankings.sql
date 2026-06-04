-- Add ranking + odds columns to teams, then populate.
-- FIFA rankings: latest published (April 2026 cycle).
-- Title odds: consensus pre-tournament futures (decimal odds, lower = bigger favorite).
-- Re-run this any time to refresh.

alter table teams add column if not exists fifa_rank   int;
alter table teams add column if not exists title_odds  numeric;  -- decimal odds (e.g. 5.5 = +450)

update teams set fifa_rank = data.r, title_odds = data.o from (values
  ('ARG', 1, 6.0),
  ('FRA', 2, 6.5),
  ('ESP', 3, 7.0),
  ('ENG', 4, 8.0),
  ('BRA', 5, 7.5),
  ('POR', 6, 11.0),
  ('NED', 7, 17.0),
  ('BEL', 8, 26.0),
  ('CRO', 9, 41.0),
  ('GER', 10, 13.0),
  ('ITA', 11, 19.0),
  ('COL', 12, 31.0),
  ('URU', 13, 26.0),
  ('MAR', 14, 51.0),
  ('USA', 15, 41.0),
  ('SUI', 16, 81.0),
  ('JPN', 17, 67.0),
  ('SEN', 18, 81.0),
  ('DEN', 19, 67.0),
  ('IRN', 20, 251.0),
  ('MEX', 21, 81.0),
  ('UKR', 22, 251.0),
  ('AUT', 23, 81.0),
  ('KOR', 24, 151.0),
  ('AUS', 25, 251.0),
  ('TUR', 26, 81.0),
  ('ECU', 27, 151.0),
  ('NOR', 28, 51.0),
  ('PAR', 29, 251.0),
  ('TUN', 30, 501.0),
  ('NGA', 31, 251.0),
  ('EGY', 32, 251.0),
  ('CIV', 33, 251.0),
  ('POL', 34, 151.0),
  ('CZE', 35, 251.0),
  ('SCO', 36, 251.0),
  ('PAN', 37, 501.0),
  ('ALG', 38, 251.0),
  ('VEN', 39, 501.0),
  ('WAL', 40, 251.0),
  ('GHA', 41, 501.0),
  ('CMR', 42, 501.0),
  ('JOR', 43, 1001.0),
  ('QAT', 44, 1001.0),
  ('CAN', 45, 251.0),
  ('UZB', 46, 1001.0),
  ('KSA', 47, 501.0),
  ('RSA', 48, 1001.0),
  ('NZL', 49, 1001.0)
) as data(id, r, o) where teams.id = data.id;
