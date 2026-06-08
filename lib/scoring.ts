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

  // -------- wooden spoon (per-group, only after tournament fully complete) --------
  const allDone = (matches as Match[]).length > 0
    && (matches as Match[]).every(m => m.status === 'FINISHED' || m.status === 'CANCELLED');

  if (allDone) {
    // Rank teams by how far they got (proxy: number of matches played).
    const teamMatchCount = new Map<string, number>();
    for (const m of matches as Match[]) {
      teamMatchCount.set(m.home_team, (teamMatchCount.get(m.home_team) ?? 0) + 1);
      teamMatchCount.set(m.away_team, (teamMatchCount.get(m.away_team) ?? 0) + 1);
    }

    // Group picks per league: group_no -> Array<{team_id, player_id, n}>
    const byGroup = new Map<number, { team_id: string; player_id: number; n: number }[]>();
    for (const p of picks as Pick[]) {
      const g = playerGroup.get(p.player_id) ?? 1;
      const list = byGroup.get(g) ?? [];
      list.push({ team_id: p.team_id, player_id: p.player_id, n: teamMatchCount.get(p.team_id) ?? 0 });
      byGroup.set(g, list);
    }

    for (const [, list] of byGroup) {
      const ranked = [...list].sort((a, b) => a.n - b.n);
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
  flags: string[];    // drafted team flag emojis
  breakdown: Record<string, number>;
};

export async function loadLeaderboard(db: SupabaseClient): Promise<LeaderboardRow[]> {
  const [{ data: players }, { data: events }, { data: picks }] = await Promise.all([
    db.from('players').select('id, name, slug, group_no, paid'),
    db.from('scoring_events').select('player_id, kind, points'),
    db.from('picks').select('player_id, pick_order, team:teams(flag_emoji, name)').order('pick_order'),
  ]);
  if (!players) return [];

  const byId = new Map<number, LeaderboardRow>();
  for (const p of players) {
    byId.set(p.id, { player_id: p.id, name: p.name, slug: p.slug, group_no: p.group_no ?? 1, paid: !!p.paid, total: 0, goals: 0, flags: [], breakdown: {} });
  }
  for (const pk of picks ?? []) {
    const row = byId.get((pk as any).player_id);
    if (!row) continue;
    const team = (pk as any).team;
    const flag = team?.flag_emoji || '🏳️';
    row.flags.push(flag);
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
