/**
 * Football-Data.org sync.
 * Free tier: 10 req/min. We poll on Vercel Cron every 15 min during the tourney.
 * Competition: WC = World Cup. We accept either the 2026 edition code (FIFA-confirmed
 * later) or fall back to the generic 'WC' competition slug.
 */

import { supabaseAdmin } from './supabase';

const FD_BASE = 'https://api.football-data.org/v4';
const COMPETITION = process.env.FOOTBALL_DATA_COMPETITION || 'WC';

// Football-Data occasionally renames TLAs mid-tournament (e.g. URY→URU on
// 2026-06). Existing rows in `teams` and FK references in `picks` use the
// original TLA, and the `(fd_id)` unique index makes a TLA swap a hard
// duplicate-key failure on every sync. Normalize back to the canonical code
// here so the rest of the pipeline stays stable.
const TLA_ALIASES: Record<string, string> = {
  URU: 'URY', // Uruguay — FD renamed 2026-06; picks/teams already key on URY
};

function teamCode(fdTeam: { tla?: string; name?: string }): string | null {
  // Football-Data exposes "tla" (3-letter code) for national teams.
  if (fdTeam?.tla) {
    const raw = fdTeam.tla.toUpperCase();
    return TLA_ALIASES[raw] ?? raw;
  }
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

  // 3) Goals — derive +1-per-goal credits from fullTime totals.
  // Football-Data free tier no longer returns scorer arrays, so we synthesize
  // one goal-row per goal. Scorer is null; minute is a synthetic 1..N per team
  // so the (match_id, team_id, scorer, minute, is_penalty_shootout) unique
  // constraint dedupes correctly across syncs.
  //
  // Trade-off: we can't distinguish own goals at this tier, so OG goals are
  // credited to the scoring team (rare — <2% of WC goals historically).
  // PK-shootout goals are correctly excluded because score.fullTime does NOT
  // include shootout goals (those are in score.penalties).
  let goalRows = 0;
  const finishedForGoals = matches.filter(m => m.status === 'FINISHED');
  const allGoalRows: any[] = [];
  for (const m of finishedForGoals) {
    const home = teamCode(m.homeTeam);
    const away = teamCode(m.awayTeam);
    if (!home || !away) continue;
    const ft = m.score?.fullTime ?? {};
    const hg = Math.max(0, ft.home ?? 0);
    const ag = Math.max(0, ft.away ?? 0);
    for (let i = 1; i <= hg; i++) {
      allGoalRows.push({
        match_id: m.id, team_id: home, scorer: `#${i}`, minute: i,
        is_own_goal: false, is_penalty_shootout: false,
      });
    }
    for (let i = 1; i <= ag; i++) {
      allGoalRows.push({
        match_id: m.id, team_id: away, scorer: `#${i}`, minute: i,
        is_own_goal: false, is_penalty_shootout: false,
      });
    }
  }
  if (allGoalRows.length > 0) {
    const { error: gErr } = await supabaseAdmin.from('goals').upsert(allGoalRows, {
      onConflict: 'match_id,team_id,scorer,minute,is_penalty_shootout',
      ignoreDuplicates: true,
    });
    if (gErr) throw new Error(`upsert goals: ${gErr.message}`);
    goalRows = allGoalRows.length;
  }

  return { upserted, goalRows };
}
