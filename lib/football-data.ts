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

  // 1) Bulk upsert teams once (de-duped) — avoids 200+ sequential round-trips.
  const teamRows = new Map<string, { id: string; fd_id: number | null; name: string }>();
  for (const m of matches) {
    const home = teamCode(m.homeTeam);
    const away = teamCode(m.awayTeam);
    if (home && !teamRows.has(home)) teamRows.set(home, { id: home, fd_id: m.homeTeam?.id ?? null, name: m.homeTeam?.name ?? home });
    if (away && !teamRows.has(away)) teamRows.set(away, { id: away, fd_id: m.awayTeam?.id ?? null, name: m.awayTeam?.name ?? away });
  }
  if (teamRows.size > 0) {
    const { error: tErr } = await supabaseAdmin
      .from('teams')
      .upsert([...teamRows.values()], { onConflict: 'id', ignoreDuplicates: true });
    if (tErr) throw new Error(`upsert teams: ${tErr.message}`);
  }

  // 2) Bulk upsert matches in one round-trip.
  const matchRows = matches
    .filter(m => teamCode(m.homeTeam) && teamCode(m.awayTeam))
    .map(m => {
      const score = m.score ?? {};
      const ft = score.fullTime ?? {};
      const pen = score.penalties ?? {};
      return {
        id: m.id,
        stage: m.stage,
        matchday: m.matchday ?? null,
        utc_date: m.utcDate,
        status: m.status,
        home_team: teamCode(m.homeTeam),
        away_team: teamCode(m.awayTeam),
        home_score: ft.home ?? 0,
        away_score: ft.away ?? 0,
        home_pk: pen.home ?? null,
        away_pk: pen.away ?? null,
        winner: score.winner ?? null,
        duration: score.duration ?? null,
        raw: m,
        updated_at: new Date().toISOString(),
      };
    });
  const { error: mErr } = await supabaseAdmin.from('matches').upsert(matchRows, { onConflict: 'id' });
  if (mErr) throw new Error(`bulk upsert matches: ${mErr.message}`);
  const upserted = matchRows.length;

  // 3) Goals — only for FINISHED matches that don't have all their goals yet.
  // Cap detail-fetch per sync to stay under Football-Data rate limit (10 req/min)
  // and Vercel's 60s function ceiling.
  let goalRows = 0;
  const finishedNeedingGoals: any[] = [];
  for (const m of matches) {
    if (m.status !== 'FINISHED') continue;
    const ft = m.score?.fullTime ?? {};
    const expected = (ft.home ?? 0) + (ft.away ?? 0);
    if (expected === 0) continue;
    const { count } = await supabaseAdmin
      .from('goals')
      .select('id', { count: 'exact', head: true })
      .eq('match_id', m.id);
    if ((count ?? 0) < expected) finishedNeedingGoals.push(m);
  }
  // Per-sync cap: at most 6 detail fetches so we never exceed FD's 10/min
  // (we already used 1 for the list call).
  for (const m of finishedNeedingGoals.slice(0, 6)) {
    const home = teamCode(m.homeTeam)!;
    const detailRes = await fetch(`${FD_BASE}/matches/${m.id}`, {
      headers: { 'X-Auth-Token': token }, cache: 'no-store',
    });
    if (!detailRes.ok) continue;
    const detail = await detailRes.json();
    const goals: any[] = detail?.match?.goals ?? detail?.goals ?? [];
    if (!goals.length) continue;
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

  return { upserted, goalRows };
}
