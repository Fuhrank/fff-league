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
  const [{ data: picks }, { data: matches }, { data: goals }, { data: players }] = await Promise.all([
    db.from('picks').select('player_id, team_id'),
    db.from('matches').select('*').order('utc_date', { ascending: true }),
    db.from('goals').select('match_id, team_id, is_own_goal, is_penalty_shootout'),
    db.from('players').select('id, group_no'),
  ]);

  if (!picks || !matches || !goals || !players) {
    throw new Error('recomputeScoring: failed to load base data');
  }

  // player_id -> group_no (each group is a fully independent league)
  const playerGroup = new Map<number, number>();
  for (const p of players as { id: number; group_no: number }[]) {
    playerGroup.set(p.id, p.group_no ?? 1);
  }

  // team_id -> ALL owners across ALL groups (same WC team can be owned in many leagues)
  const teamOwners = new Map<string, number[]>();
  for (const p of picks as Pick[]) {
    const arr = teamOwners.get(p.team_id) ?? [];
    arr.push(p.player_id);
    teamOwners.set(p.team_id, arr);
  }
  const ownersOf = (t: string): number[] => teamOwners.get(t) ?? [];

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

    for (const homeOwner of ownersOf(m.home_team)) {
      if (homeKind === 'WIN')  events.push({ player_id: homeOwner, team_id: m.home_team, match_id: m.id, kind: 'WIN',  points: 3, detail: null });
      if (homeKind === 'DRAW') events.push({ player_id: homeOwner, team_id: m.home_team, match_id: m.id, kind: 'DRAW', points: 1, detail: null });
    }
    for (const awayOwner of ownersOf(m.away_team)) {
      if (awayKind === 'WIN')  events.push({ player_id: awayOwner, team_id: m.away_team, match_id: m.id, kind: 'WIN',  points: 3, detail: null });
      if (awayKind === 'DRAW') events.push({ player_id: awayOwner, team_id: m.away_team, match_id: m.id, kind: 'DRAW', points: 1, detail: null });
    }
  }

  // goals (exclude OG and shootout) — credit every owner across all groups
  for (const g of goals as Goal[]) {
    if (g.is_own_goal || g.is_penalty_shootout) continue;
    for (const owner of ownersOf(g.team_id)) {
      events.push({ player_id: owner, team_id: g.team_id, match_id: g.match_id, kind: 'GOAL', points: 1, detail: null });
    }
  }

  // -------- advancement --------
  // (team_id, kind) — only award each advancement once per team per group.
  const awarded = new Set<string>(); // `${player_id}|${team_id}|${kind}`

  for (const m of matches as Match[]) {
    const advanceKind = STAGE_TO_ADVANCE[m.stage];
    if (advanceKind) {
      for (const t of [m.home_team, m.away_team]) {
        for (const owner of ownersOf(t)) {
          const k = `${owner}|${t}|${advanceKind}`;
          if (awarded.has(k)) continue;
          awarded.add(k);
          events.push({
            player_id: owner, team_id: t, match_id: m.id,
            kind: advanceKind, points: ADVANCE_POINTS[advanceKind], detail: null,
          });
        }
      }
    }
    if (m.stage === 'FINAL' && m.status === 'FINISHED') {
      let champ: string | null = null;
      if (m.duration === 'PENALTY_SHOOTOUT') {
        if ((m.home_pk ?? 0) > (m.away_pk ?? 0)) champ = m.home_team;
        else if ((m.away_pk ?? 0) > (m.home_pk ?? 0)) champ = m.away_team;
      } else if (m.home_score > m.away_score) champ = m.home_team;
      else if (m.away_score > m.home_score) champ = m.away_team;

      if (champ) {
        for (const owner of ownersOf(champ)) {
          events.push({
            player_id: owner, team_id: champ, match_id: m.id,
            kind: 'CHAMPION', points: ADVANCE_POINTS.CHAMPION, detail: null,
          });
        }
      }
    }
  }

  // -------- wooden spoon (per-group) --------
  // Applied live from tournament start — final-match result won't change bottom rankings
  // enough to matter, and Frank prefers seeing the bonus reflected in the leaderboard early.
  {
    // Rank teams by TOTAL FANTASY POINTS EARNED (excluding wooden-spoon itself).
    // Tiebreaker: fewer goals = worse. This matches the /rankings page ordering.
    const teamPoints = new Map<string, { pts: number; goals: number }>();
    for (const e of events) {
      const cur = teamPoints.get(e.team_id) ?? { pts: 0, goals: 0 };
      cur.pts += e.points;
      if (e.kind === 'GOAL') cur.goals += e.points;
      teamPoints.set(e.team_id, cur);
    }

    // Group picks per league: group_no -> Array<{team_id, player_id, pts, goals}>
    const byGroup = new Map<number, { team_id: string; player_id: number; pts: number; goals: number }[]>();
    for (const p of picks as Pick[]) {
      const g = playerGroup.get(p.player_id) ?? 1;
      const list = byGroup.get(g) ?? [];
      const tp = teamPoints.get(p.team_id) ?? { pts: 0, goals: 0 };
      list.push({ team_id: p.team_id, player_id: p.player_id, pts: tp.pts, goals: tp.goals });
      byGroup.set(g, list);
    }

    for (const [, list] of byGroup) {
      const ranked = [...list].sort((a, b) => a.pts - b.pts || a.goals - b.goals);
      const bottom10 = ranked.slice(0, 10);
      const bottom2  = ranked.slice(0, 2);
      for (const x of bottom10) {
        events.push({ player_id: x.player_id, team_id: x.team_id, match_id: 0, kind: 'WOODEN_BOTTOM_10', points: 10, detail: 'wooden-spoon bottom 10 (per group)' });
      }
      for (const x of bottom2) {
        events.push({ player_id: x.player_id, team_id: x.team_id, match_id: 0, kind: 'WOODEN_BOTTOM_2', points: 20, detail: 'wooden-spoon bottom 2 (per group)' });
      }
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
  paid: boolean;
  total: number;
  goals: number;      // tiebreaker
  flags: Array<{ flag: string; name: string; eliminated: boolean }>;    // drafted teams
  breakdown: Record<string, number>;
  grade: string;      // A+, A, B+, ... based on roster strength vs group
  ev: number;         // expected points from roster (modeled off title odds)
};

// Expected-points model for a single team given decimal title odds.
// Implied title prob p = 1/odds. Probability of reaching round r approximated as
// p ^ ((6 - r + 1)/6) — a monotonic decay so favorites are more likely to reach
// later rounds. Group-stage baseline scales between 4 (long-shot) and 10 pts
// (favorite) based on the same implied title prob.
function teamExpectedPoints(titleOdds: number | null | undefined): number {
  if (!titleOdds || titleOdds <= 0) return 4; // unknown odds → assume long shot baseline
  const p = 1 / titleOdds;
  const groupPts = 4 + 6 * Math.pow(p, 0.2);
  let adv = 0;
  const stages: Array<[number, number]> = [
    [1, 5],   // R32
    [2, 6],   // R16
    [3, 7],   // QF
    [4, 8],   // SF
    [5, 9],   // Final
    [6, 10],  // Champion
  ];
  for (const [r, pts] of stages) {
    const pReach = Math.pow(p, (6 - r + 1) / 6);
    adv += pts * pReach;
  }
  return groupPts + adv;
}

// Letter-grade ladder. We slot players by rank within their group (since G1
// drafts 4 teams and G2 drafts 6 — EVs are not directly comparable across
// groups). The ladder length adapts to group size.
const GRADE_LADDERS: Record<number, string[]> = {
  8:  ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'],
  12: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'],
};
function ladderFor(n: number): string[] {
  if (GRADE_LADDERS[n]) return GRADE_LADDERS[n];
  // Generic fallback: spread A+..F across n players.
  const base = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'];
  if (n <= base.length) return base.slice(0, n);
  // For groups larger than 12, just repeat the bottom rung.
  return [...base, ...Array(n - base.length).fill('F')];
}

export async function loadLeaderboard(db: SupabaseClient): Promise<LeaderboardRow[]> {
  const [{ data: players }, { data: events }, { data: picks }] = await Promise.all([
    db.from('players').select('id, name, slug, group_no, paid'),
    db.from('scoring_events').select('player_id, kind, points'),
    db.from('picks').select('player_id, pick_order, team:teams(flag_emoji, name, title_odds, eliminated_round)').order('pick_order'),
  ]);
  if (!players) return [];

  const byId = new Map<number, LeaderboardRow>();
  for (const p of players) {
    byId.set(p.id, { player_id: p.id, name: p.name, slug: p.slug, group_no: p.group_no ?? 1, paid: !!p.paid, total: 0, goals: 0, flags: [], breakdown: {}, grade: '', ev: 0 });
  }
  for (const pk of picks ?? []) {
    const row = byId.get((pk as any).player_id);
    if (!row) continue;
    const team = (pk as any).team;
    const flag = team?.flag_emoji || '🏳️';
    const elim = !!team?.eliminated_round && team.eliminated_round !== 'CHAMPION';
    row.flags.push({ flag, name: team?.name ?? '', eliminated: elim });
    row.ev += teamExpectedPoints(team?.title_odds);
  }
  for (const e of events ?? []) {
    const row = byId.get(e.player_id);
    if (!row) continue;
    row.total += e.points;
    row.breakdown[e.kind] = (row.breakdown[e.kind] ?? 0) + e.points;
    if (e.kind === 'GOAL') row.goals += e.points;
  }

  // Assign letter grades within each group, ranked by EV (roster strength).
  const all = Array.from(byId.values());
  const groups: Record<number, LeaderboardRow[]> = {};
  for (const r of all) {
    (groups[r.group_no] ||= []).push(r);
  }
  for (const gn of Object.keys(groups)) {
    const rows = groups[Number(gn)];
    const ranked = [...rows].sort((a, b) => b.ev - a.ev);
    const ladder = ladderFor(ranked.length);
    ranked.forEach((row, i) => {
      row.grade = ladder[i] ?? 'F';
    });
  }

  return all.sort((a, b) =>
    b.total - a.total || b.goals - a.goals || a.name.localeCompare(b.name)
  );
}
