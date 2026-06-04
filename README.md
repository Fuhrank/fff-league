# FFF LEAGUE — Frank's Fantasy Fútbol

> 48 teams. 12 owners. One champion.

World Cup 2026 fantasy league. Each owner drafts 4 national teams. Points roll in automatically as matches finish.

## Stack
- **Next.js 15** (App Router) on **Vercel** Hobby (free)
- **Supabase** Postgres (free) for data
- **Football-Data.org** v4 (free) as match source
- **Vercel Cron** every 15 min during the tournament

## Scoring
| Event | Points |
|---|---|
| Win (regulation/ET) | +3 |
| Draw (incl. PK winner: +1 + advancement) | +1 |
| Goal scored (own goals & shootout goals excluded) | +1 |
| Advance to R32 (survive groups) | +5 |
| Advance to R16 | +6 |
| Advance to QF | +7 |
| Advance to SF | +8 |
| Advance to Final | +9 |
| Champion | +10 |
| Wooden spoon — bottom 10 owners | +10 / bottom team |
| Wooden spoon — bottom 2 owners | +20 / bottom team |

Tiebreaker: total goals across owner's 4 teams (desc).

## Setup
1. Create Supabase project, paste `supabase/schema.sql` then `supabase/seed_teams.sql`.
2. Copy `.env.example` → `.env.local`, fill in values.
3. `npm install && npm run dev` → http://localhost:3000
4. Visit `/admin`, log in with `ADMIN_PASSWORD`, add owners + draft picks.
5. Deploy: `vercel`. Set env vars in Vercel dashboard. Cron runs automatically.

## Pages
- `/` — leaderboard
- `/player/[slug]` — owner detail with per-team breakdown
- `/today` — today's matches w/ live scores
- `/admin` — add owners, record picks, force sync/recompute
