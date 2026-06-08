/**
 * FFF League scoring engine.
 *
 * Rules (locked in 2026-06-03):
 *  - Win in regulation/ET:           +3 to the team's owner
 *  - Draw (incl. PK shootout winner kept as +1 + advancement):
 *                                    +1 to each owner
 *  - Goal in regulation/ET:          +1 per goal scored by an owned team
 *                                    (own goals & PK-shootout goals EXCLUDED)
 *  - Survive groups (advance to R32): +5
 *  - Advance to R16:                 +6
 *  - Advance to QF:                  +7
 *  - Advance to SF:                  +8
 *  - Advance to Final:               +9
 *  - Win the tournament (Champion):  +10
 *  - End-of-tournament wooden spoon:
 *      bottom 10 owners get +10 PER bottom team they own
 *      bottom 2  owners get +20 PER bottom team they own
 *  - Tiebreaker on leaderboard: total goals across owner's 4 teams (desc).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export const ADVANCE_POINTS: Record<string, number> = {
  ADVANCE_R32: 5,    // survived groups
  ADVANCE_R16: 6,
  ADVANCE_QF:  7,
  ADVANCE_SF:  8,
  ADVANCE_FINAL: 9,
  CHAMPION: 10,
};

// Map a football-data stage code to the "advance" event awarded to BOTH teams
// who appear in that stage's match (because they reached it).
const STAGE_TO_ADVANCE: Record<string, string> = {
  LAST_32:          'ADVANCE_R32',
  LAST_16:          'ADVANCE_R16',
  QUARTER_FINALS:   'ADVANCE_QF',
  SEMI_FINALS:      'ADVANCE_SF',
  FINAL:            'ADVANCE_FINAL',
};

type Match = {
  id: number;
  stage: string;
  status: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  home_pk: number | null;
  away_pk: number | null;
  winner: string | null;
  duration: string | null;
};

type Goal = {
  match_id: number;
  team_id: string;
  is_own_goal: boolean;
  is_penalty_shootout: boolean;
};

type Pick = { player_id: number; team_id: string };

/**
 * Recompute ALL scoring_events from scratch based on the current state of
 * matches + goals + picks. Idempotent — safe to call after every sync.
 */
export async function recomputeScoring(db: SupabaseClient) {
  const [{ data: picks }, { data: matches }, { data: goals }] = await Promise.all([
    db.from('picks').select('player_id, team_id'),
    db.from('matches').select('*').order('utc_date', { ascending: true }),
    db.from('goals').select('match_id, team_id, is_own_goal, is_penalty_shootout'),
  ]);

  if (!picks || !matches || !goals) {
    throw new Error('recomputeScoring: failed to load base data');
  }

  // team_id -> player_id
  const teamOwner = new Map<string, number>();
  for (const p of picks as Pick[]) teamOwner.set(p.team_id, p.player_id);

  type Event = {
    player_id: number;
    team_id: string;
    match_id: number;
    kind: string;
    points: number;
    detail: string | null;
  };
  const events: Event[] = [];

  // -------- per-match results & goals --------
  for (const m of matches as Match[]) {
    if (m.status !== 'FINISHED') continue;

    const homeOwner = teamOwner.get(m.home_team);
    const awayOwner = teamOwner.get(m.away_team);

    // Determine "league" winner for our scoring purposes.
    // PK shootout: treat as a DRAW for both owners (+1 each); the
    // shootout winner ALSO receives the appropriate ADVANCE_* event
    // when they appear in the next round's match (handled below).
    let homeKind: 'WIN' | 'DRAW' | 'LOSS' = 'LOSS';
    let awayKind: 'WIN' | 'DRAW' | 'LOSS' = 'LOSS';

    if (m.duration === 'PENALTY_SHOOTOUT') {
      homeKind = 'DRAW';
      awayKind = 'DRAW';
    } else if (m.home_score > m.away_score) {
      homeKind = 'WIN'; awayKind = 'LOSS';
    } else if (m.away_score > m.home_score) {
      homeKind = 'LOSS'; awayKind = 'WIN';
    } else {
      homeKind = 'DRAW'; awayKind = 'DRAW';
    }

    if (homeOwner) {
      if (homeKind === 'WIN')  events.push({ player_id: homeOwner, team_id: m.home_team, match_id: m.id, kind: 'WIN',  points: 3, detail: null });
      if (homeKind === 'DRAW') events.push({ player_id: homeOwner, team_id: m.home_team, match_id: m.id, kind: 'DRAW', points: 1, detail: null });
    }
    if (awayOwner) {
      if (awayKind === 'WIN')  events.push({ player_id: awayOwner, team_id: m.away_team, match_id: m.id, kind: 'WIN',  points: 3, detail: null });
      if (awayKind === 'DRAW') events.push({ player_id: awayOwner, team_id: m.away_team, match_id: m.id, kind: 'DRAW', points: 1, detail: null });
    }
  }

  // goals (exclude OG and shootout)
  for (const g of goals as Goal[]) {
    if (g.is_own_goal || g.is_penalty_shootout) continue;
    const owner = teamOwner.get(g.team_id);
    if (!owner) continue;
    events.push({ player_id: owner, team_id: g.team_id, match_id: g.match_id, kind: 'GOAL', points: 1, detail: null });
  }

  // -------- advancement --------
  // A team is awarded ADVANCE_<stage> for the EARLIEST match in which it appears
  // at that stage (i.e. by being in the bracket of the next round, they advanced).
  // Champion = winner of the FINAL.
  const awarded = new Set<string>(); // `${team_id}|${kind}`

  for (const m of matches as Match[]) {
    const advanceKind = STAGE_TO_ADVANCE[m.stage];
    if (advanceKind) {
      for (const t of [m.home_team, m.away_team]) {
        const owner = teamOwner.get(t);
        if (!owner) continue;
        const key = `${t}|${advanceKind}`;
        if (awarded.has(key)) continue;
        awarded.add(key);
        events.push({
          player_id: owner, team_id: t, match_id: m.id,
          kind: advanceKind, points: ADVANCE_POINTS[advanceKind], detail: null,
        });
      }
    }
    if (m.stage === 'FINAL' && m.status === 'FINISHED') {
      // Champion = whoever advances out of the final.
      let champ: string | null = null;
      if (m.duration === 'PENALTY_SHOOTOUT') {
        if ((m.home_pk ?? 0) > (m.away_pk ?? 0)) champ = m.home_team;
        else if ((m.away_pk ?? 0) > (m.home_pk ?? 0)) champ = m.away_team;
      } else if (m.home_score > m.away_score) champ = m.home_team;
      else if (m.away_score > m.home_score) champ = m.away_team;

      if (champ) {
        const owner = teamOwner.get(champ);
        if (owner) {
          events.push({
            player_id: owner, team_id: champ, match_id: m.id,
            kind: 'CHAMPION', points: ADVANCE_POINTS.CHAMPION, detail: null,
          });
        }
      }
    }
  }

  // -------- wooden spoon (only after tournament fully complete) --------
  const allDone = (matches as Match[]).length > 0
    && (matches as Match[]).every(m => m.status === 'FINISHED' || m.status === 'CANCELLED');

  if (allDone) {
    // Rank teams by "how far they got" — proxied by number of matches played.
    // For wooden spoon we want the 10 teams that got the least far.
    const teamMatchCount = new Map<string, number>();
    for (const m of matches as Match[]) {
      teamMatchCount.set(m.home_team, (teamMatchCount.get(m.home_team) ?? 0) + 1);
      teamMatchCount.set(m.away_team, (teamMatchCount.get(m.away_team) ?? 0) + 1);
    }
    const ranked = [...teamOwner.keys()]
      .map(t => ({ t, n: teamMatchCount.get(t) ?? 0 }))
      .sort((a, b) => a.n - b.n);

    const bottom10 = ranked.slice(0, 10).map(x => x.t);
    const bottom2  = ranked.slice(0, 2).map(x => x.t);

    for (const t of bottom10) {
      const owner = teamOwner.get(t)!;
      events.push({ player_id: owner, team_id: t, match_id: 0, kind: 'WOODEN_BOTTOM_10', points: 10, detail: 'wooden-spoon bottom 10' });
    }
    for (const t of bottom2) {
      const owner = teamOwner.get(t)!;
      events.push({ player_id: owner, team_id: t, match_id: 0, kind: 'WOODEN_BOTTOM_2', points: 20, detail: 'wooden-spoon bottom 2' });
    }
  }

  // -------- write atomically: wipe and reinsert --------
  await db.from('scoring_events').delete().neq('id', -1);
  if (events.length) {
    // chunked insert
    for (let i = 0; i < events.length; i += 500) {
      const chunk = events.slice(i, i + 500);
      const { error } = await db.from('scoring_events').insert(chunk);
      if (error) throw new Error(`insert scoring_events: ${error.message}`);
    }
  }

  return { events: events.length };
}

export type LeaderboardRow = {
  player_id: number;
  name: string;
  slug: string;
  group_no: number;
  total: number;
  goals: number;      // tiebreaker
  breakdown: Record<string, number>;
};

export async function loadLeaderboard(db: SupabaseClient): Promise<LeaderboardRow[]> {
  const [{ data: players }, { data: events }] = await Promise.all([
    db.from('players').select('id, name, slug, group_no'),
    db.from('scoring_events').select('player_id, kind, points'),
  ]);
  if (!players) return [];

  const byId = new Map<number, LeaderboardRow>();
  for (const p of players) {
    byId.set(p.id, { player_id: p.id, name: p.name, slug: p.slug, group_no: p.group_no ?? 1, total: 0, goals: 0, breakdown: {} });
  }
  for (const e of events ?? []) {
    const row = byId.get(e.player_id);
    if (!row) continue;
    row.total += e.points;
    row.breakdown[e.kind] = (row.breakdown[e.kind] ?? 0) + e.points;
    if (e.kind === 'GOAL') row.goals += e.points;
  }

  return [...byId.values()].sort((a, b) =>
    b.total - a.total || b.goals - a.goals || a.name.localeCompare(b.name)
  );
}
