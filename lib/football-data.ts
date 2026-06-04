/**
 * Football-Data.org sync.
 * Free tier: 10 req/min. We poll on Vercel Cron every 15 min during the tourney.
 * Competition: WC = World Cup. We accept either the 2026 edition code (FIFA-confirmed
 * later) or fall back to the generic 'WC' competition slug.
 */

import { supabaseAdmin } from './supabase';

const FD_BASE = 'https://api.football-data.org/v4';
const COMPETITION = process.env.FOOTBALL_DATA_COMPETITION || 'WC';

function teamCode(fdTeam: { tla?: string; name?: string }): string | null {
  // Football-Data exposes "tla" (3-letter code) for national teams.
  if (fdTeam?.tla) return fdTeam.tla.toUpperCase();
  return null;
}

export async function syncFromFootballData() {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) throw new Error('FOOTBALL_DATA_TOKEN missing');

  const res = await fetch(`${FD_BASE}/competitions/${COMPETITION}/matches`, {
    headers: { 'X-Auth-Token': token },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`football-data ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = await res.json();
  const matches: any[] = json.matches ?? [];

  let upserted = 0, goalRows = 0;

  for (const m of matches) {
    const home = teamCode(m.homeTeam);
    const away = teamCode(m.awayTeam);
    if (!home || !away) continue; // skip placeholder slots

    // Upsert teams (in case we don't have them yet w/ fd_id)
    await supabaseAdmin.from('teams').upsert([
      { id: home, fd_id: m.homeTeam?.id, name: m.homeTeam?.name ?? home },
      { id: away, fd_id: m.awayTeam?.id, name: m.awayTeam?.name ?? away },
    ], { onConflict: 'id', ignoreDuplicates: true });

    const score = m.score ?? {};
    const ft = score.fullTime ?? {};
    const pen = score.penalties ?? {};

    const row = {
      id: m.id,
      stage: m.stage,
      matchday: m.matchday ?? null,
      utc_date: m.utcDate,
      status: m.status,
      home_team: home,
      away_team: away,
      home_score: ft.home ?? 0,
      away_score: ft.away ?? 0,
      home_pk: pen.home ?? null,
      away_pk: pen.away ?? null,
      winner: score.winner ?? null,
      duration: score.duration ?? null,
      raw: m,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabaseAdmin.from('matches').upsert(row, { onConflict: 'id' });
    if (error) throw new Error(`upsert match ${m.id}: ${error.message}`);
    upserted++;

    // Goals — football-data returns them on individual match endpoints, not the list endpoint.
    // For free-tier friendliness, we fetch goals only for FINISHED matches we haven't fully synced.
    if (m.status === 'FINISHED') {
      const { count } = await supabaseAdmin
        .from('goals')
        .select('id', { count: 'exact', head: true })
        .eq('match_id', m.id);
      const expected = (ft.home ?? 0) + (ft.away ?? 0);
      if ((count ?? 0) < expected) {
        const detailRes = await fetch(`${FD_BASE}/matches/${m.id}`, {
          headers: { 'X-Auth-Token': token }, cache: 'no-store',
        });
        if (detailRes.ok) {
          const detail = await detailRes.json();
          const goals: any[] = detail?.match?.goals ?? detail?.goals ?? [];
          if (goals.length) {
            const rows = goals.map((g: any) => ({
              match_id: m.id,
              team_id: teamCode(g.team) ?? home,
              scorer: g.scorer?.name ?? null,
              minute: g.minute ?? null,
              is_own_goal: g.type === 'OWN',
              is_penalty_shootout: g.type === 'PENALTY_SHOOTOUT',
            }));
            await supabaseAdmin.from('goals').upsert(rows, {
              onConflict: 'match_id,team_id,scorer,minute,is_penalty_shootout',
              ignoreDuplicates: true,
            });
            goalRows += rows.length;
          }
        }
      }
    }
  }

  return { upserted, goalRows };
}
