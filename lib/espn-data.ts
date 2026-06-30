/**
 * ESPN scoreboard sync — used in place of Football-Data after FD restricted
 * the World Cup competition on their free tier (returns 403 mid-tournament).
 *
 * Strategy:
 *   - ESPN's public scoreboard endpoint requires no auth and shows match
 *     status + scores. We query a wide window so stale TIMED rows get
 *     backfilled and KO bracket matches are available as soon as ESPN posts.
 *   - We match each ESPN event to an existing row in `matches` by team TLAs
 *     and kickoff date (within ±24h). On match → UPDATE status + scores.
 *   - For KO matches not yet in the DB (LAST_32 / LAST_16 / etc.), we INSERT
 *     a new row using the ESPN event ID (no collision with FD ids — FD < 600k,
 *     ESPN > 700k). We only insert when BOTH TLAs map to real teams in our
 *     DB — ESPN bracket placeholders like "RD32"/"RD16"/"W1" are skipped.
 *   - On FINISHED KO matches we set the LOSER's `eliminated_round` so the
 *     leaderboard red-X overlay and player-page (eliminated) badge reflect
 *     reality automatically.
 *   - Goals are derived from final scores for FINISHED matches (same as FD
 *     sync — free tier never gave us scorer data).
 */

import { supabaseAdmin } from './supabase';

const ESPN_SCOREBOARD_BASE =
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

// ESPN's scoreboard with no params returns ONLY today's matches.
// We pass a wide dates= window so stale TIMED rows (matches that finished
// while sync was down — Mac asleep, GH Actions skipped, etc.) get backfilled.
// Window: last 7 days through next 30 days (covers the full KO bracket).
function buildScoreboardUrl(): string {
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  const now = Date.now();
  const start = new Date(now - 7 * 24 * 3600 * 1000);
  const end = new Date(now + 30 * 24 * 3600 * 1000);
  return `${ESPN_SCOREBOARD_BASE}?dates=${fmt(start)}-${fmt(end)}&limit=200`;
}

// ESPN status.type.state → our DB status enum (matches FD's original values).
const STATE_MAP: Record<string, string> = {
  pre: 'TIMED',
  in: 'IN_PLAY',
  post: 'FINISHED',
};

// ESPN season.slug → our DB stage enum. ESPN occasionally uses minor variants;
// we lowercase-match.
const STAGE_MAP: Record<string, string> = {
  'group-stage': 'GROUP_STAGE',
  'round-of-32': 'LAST_32',
  'round-of-16': 'LAST_16',
  quarterfinals: 'QUARTER_FINALS',
  semifinals: 'SEMI_FINALS',
  final: 'FINAL',
  'third-place': 'THIRD_PLACE',
};

// Stage → eliminated_round token written to teams.eliminated_round for the
// loser when a KO match finishes.
const STAGE_TO_ELIMINATED: Record<string, string> = {
  LAST_32: 'R32',
  LAST_16: 'R16',
  QUARTER_FINALS: 'QF',
  SEMI_FINALS: 'SF',
  FINAL: 'FINAL_RUNNER_UP',
};

// ESPN occasionally uses different abbreviations than FD did. Add aliases
// here as we discover them (key = ESPN abbr, value = canonical DB TLA).
const ESPN_TLA_ALIASES: Record<string, string> = {
  // none observed yet; populate as needed
};

// ESPN bracket placeholders ("RD32 W1", "W1", "RD16", etc.) appear before
// the bracket fills in. Skip any token that doesn't look like a real TLA.
function isPlaceholderTla(abbr: string | undefined | null): boolean {
  if (!abbr) return true;
  const raw = abbr.toUpperCase().trim();
  // Real TLAs are 2-4 letter codes with no digits.
  if (/\d/.test(raw)) return true;
  if (raw.startsWith('RD')) return true;
  if (raw.length > 4) return true;
  if (/^W\d+$/.test(raw)) return true;
  return false;
}

function canonTla(abbr: string | undefined | null): string | null {
  if (!abbr) return null;
  const raw = abbr.toUpperCase().trim();
  if (isPlaceholderTla(raw)) return null;
  return ESPN_TLA_ALIASES[raw] ?? raw;
}

export async function syncFromEspn() {
  const res = await fetch(buildScoreboardUrl(), { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`espn scoreboard ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const json = await res.json();
  const events: any[] = json.events ?? [];

  // Preload the team TLA whitelist so we never insert a row referencing a
  // team that doesn't exist (foreign-key error).
  const { data: teamRows, error: tErr } = await supabaseAdmin
    .from('teams').select('id');
  if (tErr) throw new Error(`load teams: ${tErr.message}`);
  const validTlas = new Set((teamRows ?? []).map((t: any) => t.id));

  let updated = 0;
  let inserted = 0;
  let notMatched = 0;
  let goalRows = 0;
  let eliminationsSet = 0;
  const finishedKO: Array<{ id: number; stage: string; winner: string; loser: string }> = [];
  const finishedMatched: Array<{ id: number; home: string; away: string; hg: number; ag: number }> = [];

  for (const ev of events) {
    const comp = ev.competitions?.[0];
    if (!comp) continue;
    const home = comp.competitors?.find((c: any) => c.homeAway === 'home');
    const away = comp.competitors?.find((c: any) => c.homeAway === 'away');
    if (!home || !away) continue;

    const homeTla = canonTla(home.team?.abbreviation);
    const awayTla = canonTla(away.team?.abbreviation);
    if (!homeTla || !awayTla) continue;             // placeholder bracket slot
    if (!validTlas.has(homeTla) || !validTlas.has(awayTla)) continue;

    const state = comp.status?.type?.state ?? 'pre';
    const dbStatus = STATE_MAP[state] ?? 'TIMED';
    const homeScore = Number(home.score ?? 0) || 0;
    const awayScore = Number(away.score ?? 0) || 0;
    const eventDate = ev.date as string;
    const espnId = Number(ev.id);

    const slugRaw = (ev.season?.slug ?? '').toLowerCase();
    const dbStage = STAGE_MAP[slugRaw] ?? 'GROUP_STAGE';

    // Try to find an existing match by TLAs + kickoff within ±24h.
    const eventTime = new Date(eventDate).getTime();
    const minTime = new Date(eventTime - 24 * 3600 * 1000).toISOString();
    const maxTime = new Date(eventTime + 24 * 3600 * 1000).toISOString();

    const { data: existing, error: qErr } = await supabaseAdmin
      .from('matches')
      .select('id, home_team, away_team, utc_date, stage')
      .eq('home_team', homeTla)
      .eq('away_team', awayTla)
      .gte('utc_date', minTime)
      .lte('utc_date', maxTime)
      .limit(1);
    if (qErr) throw new Error(`query matches: ${qErr.message}`);

    let matchId: number | null = null;
    let duration: string | null = null;
    let homePk: number | null = null;
    let awayPk: number | null = null;

    // ESPN exposes shootout result in status.type.name 'STATUS_FINAL_PEN' and
    // sometimes in the headline ("Paraguay advance 4-3 on penalties").
    const statusName = comp.status?.type?.name ?? '';
    if (statusName === 'STATUS_FINAL_PEN') {
      duration = 'PENALTY_SHOOTOUT';
      const headlines: string[] = (comp.notes ?? []).map((n: any) => n.headline ?? '').filter(Boolean);
      for (const h of headlines) {
        const m = h.match(/(\d+)\s*-\s*(\d+)\s*on penalties/i);
        if (m) {
          // Headline is winner-perspective; we need to attribute it.
          const winA = Number(m[1]);
          const winB = Number(m[2]);
          // The winning side is whichever competitor has winner === true.
          const homeWon = home.winner === true;
          const awayWon = away.winner === true;
          if (homeWon) { homePk = winA; awayPk = winB; }
          else if (awayWon) { awayPk = winA; homePk = winB; }
          break;
        }
      }
    }

    if (!existing || existing.length === 0) {
      // No existing row. INSERT only for KO matches (we never want to invent
      // group-stage rows — those were preloaded with the official schedule).
      if (dbStage === 'GROUP_STAGE') {
        notMatched++;
        continue;
      }
      const insertRow: any = {
        id: espnId,
        stage: dbStage,
        utc_date: eventDate,
        status: dbStatus,
        home_team: homeTla,
        away_team: awayTla,
        home_score: homeScore,
        away_score: awayScore,
        home_pk: homePk,
        away_pk: awayPk,
        duration,
        updated_at: new Date().toISOString(),
      };
      const { error: iErr } = await supabaseAdmin
        .from('matches').upsert(insertRow, { onConflict: 'id' });
      if (iErr) throw new Error(`insert match ${espnId}: ${iErr.message}`);
      matchId = espnId;
      inserted++;
    } else {
      matchId = existing[0].id;
      const updatePayload: any = {
        status: dbStatus,
        stage: dbStage,                       // keep stage in sync if KO row was added with wrong stage earlier
        home_score: homeScore,
        away_score: awayScore,
        updated_at: new Date().toISOString(),
      };
      if (duration) updatePayload.duration = duration;
      if (homePk !== null) updatePayload.home_pk = homePk;
      if (awayPk !== null) updatePayload.away_pk = awayPk;
      const { error: uErr } = await supabaseAdmin
        .from('matches').update(updatePayload).eq('id', matchId);
      if (uErr) throw new Error(`update match ${matchId}: ${uErr.message}`);
      updated++;
    }

    if (dbStatus === 'FINISHED' && matchId !== null) {
      finishedMatched.push({ id: matchId, home: homeTla, away: awayTla, hg: homeScore, ag: awayScore });

      // Determine winner/loser for KO elimination tagging.
      if (dbStage !== 'GROUP_STAGE') {
        let winnerTla: string | null = null;
        let loserTla: string | null = null;
        if (duration === 'PENALTY_SHOOTOUT') {
          if (home.winner === true)      { winnerTla = homeTla; loserTla = awayTla; }
          else if (away.winner === true) { winnerTla = awayTla; loserTla = homeTla; }
        } else if (homeScore > awayScore) {
          winnerTla = homeTla; loserTla = awayTla;
        } else if (awayScore > homeScore) {
          winnerTla = awayTla; loserTla = homeTla;
        }
        if (loserTla && STAGE_TO_ELIMINATED[dbStage]) {
          finishedKO.push({ id: matchId, stage: dbStage, winner: winnerTla!, loser: loserTla });
        }
      }
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

  // Tag eliminated teams from finished KO matches. Only update teams whose
  // current eliminated_round is null OR already set to GROUP (which we
  // wrote when a team lost in groups — KO entry means they actually
  // advanced past groups, but if they then lose in R32 the canonical token
  // is 'R32'). We never overwrite a deeper round.
  const ELIM_RANK: Record<string, number> = {
    GROUP: 0, R32: 1, R16: 2, QF: 3, SF: 4, FINAL_RUNNER_UP: 5, CHAMPION: 6,
  };
  for (const ko of finishedKO) {
    const token = STAGE_TO_ELIMINATED[ko.stage];
    if (!token) continue;
    const { data: cur } = await supabaseAdmin
      .from('teams').select('id, eliminated_round').eq('id', ko.loser).limit(1);
    const existing = (cur ?? [])[0]?.eliminated_round as string | null | undefined;
    const existingRank = existing ? (ELIM_RANK[existing] ?? -1) : -1;
    const newRank = ELIM_RANK[token];
    if (newRank > existingRank) {
      const { error: eErr } = await supabaseAdmin
        .from('teams').update({ eliminated_round: token }).eq('id', ko.loser);
      if (eErr) throw new Error(`tag elimination ${ko.loser}: ${eErr.message}`);
      eliminationsSet++;
    }
  }

  return { upserted: updated, inserted, notMatched, goalRows, eliminationsSet };
}
