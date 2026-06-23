/**
 * ESPN scoreboard sync — used in place of Football-Data after FD restricted
 * the World Cup competition on their free tier (returns 403 mid-tournament).
 *
 * Strategy:
 *   - ESPN's public scoreboard endpoint requires no auth and shows the current
 *     day's WC matches with live status + scores.
 *   - We match each ESPN event to an existing row in `matches` by team TLAs
 *     and kickoff date (within ±24h).
 *   - We UPDATE status + scores on matched rows; goals are derived from final
 *     scores for FINISHED matches (same approach as the old FD sync).
 *   - We do NOT insert new matches from ESPN — the tournament schedule was
 *     pre-loaded from FD and IDs need to stay stable for picks/wagers FKs.
 */

import { supabaseAdmin } from './supabase';

const ESPN_SCOREBOARD =
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

// ESPN status.type.state → our DB status enum (matches FD's original values).
const STATE_MAP: Record<string, string> = {
  pre: 'TIMED',
  in: 'IN_PLAY',
  post: 'FINISHED',
};

// ESPN occasionally uses different abbreviations than FD did. Add aliases
// here as we discover them (key = ESPN abbr, value = canonical DB TLA).
const ESPN_TLA_ALIASES: Record<string, string> = {
  // none observed yet; populate as needed
};

function canonTla(abbr: string | undefined | null): string | null {
  if (!abbr) return null;
  const raw = abbr.toUpperCase();
  return ESPN_TLA_ALIASES[raw] ?? raw;
}

export async function syncFromEspn() {
  const res = await fetch(ESPN_SCOREBOARD, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`espn scoreboard ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const json = await res.json();
  const events: any[] = json.events ?? [];

  let updated = 0;
  let notMatched = 0;
  let goalRows = 0;
  const finishedMatched: Array<{ id: number; home: string; away: string; hg: number; ag: number }> = [];

  for (const ev of events) {
    const comp = ev.competitions?.[0];
    if (!comp) continue;
    const home = comp.competitors?.find((c: any) => c.homeAway === 'home');
    const away = comp.competitors?.find((c: any) => c.homeAway === 'away');
    if (!home || !away) continue;

    const homeTla = canonTla(home.team?.abbreviation);
    const awayTla = canonTla(away.team?.abbreviation);
    if (!homeTla || !awayTla) continue;

    const state = comp.status?.type?.state ?? 'pre';
    const dbStatus = STATE_MAP[state] ?? 'TIMED';
    const homeScore = Number(home.score ?? 0) || 0;
    const awayScore = Number(away.score ?? 0) || 0;
    const eventDate = ev.date as string;

    // Find the existing match in DB. Match by TLAs + kickoff within ±24h.
    const eventTime = new Date(eventDate).getTime();
    const minTime = new Date(eventTime - 24 * 3600 * 1000).toISOString();
    const maxTime = new Date(eventTime + 24 * 3600 * 1000).toISOString();

    const { data: existing, error: qErr } = await supabaseAdmin
      .from('matches')
      .select('id, home_team, away_team, utc_date')
      .eq('home_team', homeTla)
      .eq('away_team', awayTla)
      .gte('utc_date', minTime)
      .lte('utc_date', maxTime)
      .limit(1);
    if (qErr) throw new Error(`query matches: ${qErr.message}`);

    if (!existing || existing.length === 0) {
      notMatched++;
      continue;
    }
    const matchId = existing[0].id;

    const { error: uErr } = await supabaseAdmin
      .from('matches')
      .update({
        status: dbStatus,
        home_score: homeScore,
        away_score: awayScore,
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchId);
    if (uErr) throw new Error(`update match ${matchId}: ${uErr.message}`);
    updated++;

    if (dbStatus === 'FINISHED') {
      finishedMatched.push({ id: matchId, home: homeTla, away: awayTla, hg: homeScore, ag: awayScore });
    }
  }

  // Synthesize goal rows for FINISHED matches (same dedupe pattern as FD sync).
  if (finishedMatched.length > 0) {
    const allGoalRows: any[] = [];
    for (const m of finishedMatched) {
      for (let i = 1; i <= m.hg; i++) {
        allGoalRows.push({
          match_id: m.id, team_id: m.home, scorer: `#${i}`, minute: i,
          is_own_goal: false, is_penalty_shootout: false,
        });
      }
      for (let i = 1; i <= m.ag; i++) {
        allGoalRows.push({
          match_id: m.id, team_id: m.away, scorer: `#${i}`, minute: i,
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
  }

  return { upserted: updated, notMatched, goalRows };
}
