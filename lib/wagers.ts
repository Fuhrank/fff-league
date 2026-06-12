/**
 * Auto-settle wagers linked to a specific match.
 * - Active wager + match FINISHED → set winner from score.winner
 *   HOME_TEAM → team_a wins; AWAY_TEAM → team_b wins; DRAW → push (no winner, status='push')
 * - PENALTY_SHOOTOUT duration: in our scoring convention, regulation result is a draw,
 *   but for a single-match wager the team that ADVANCES wins the bet. We use score.winner
 *   which Football-Data sets to the shootout winner.
 * - Idempotent: only touches rows with status='active'.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export async function autoSettleWagers(db: SupabaseClient) {
  // Pull active wagers that have a linked match.
  const { data: wagers, error } = await db
    .from('wagers')
    .select('id, match_id, team_a, team_b, player_a_id, player_b_id')
    .eq('status', 'active')
    .not('match_id', 'is', null);
  if (error) throw new Error(`load wagers: ${error.message}`);
  if (!wagers || wagers.length === 0) return { settled: 0, pushed: 0 };

  const matchIds = [...new Set(wagers.map((w: any) => w.match_id))];
  const { data: matches, error: mErr } = await db
    .from('matches')
    .select('id, status, winner, raw')
    .in('id', matchIds);
  if (mErr) throw new Error(`load matches: ${mErr.message}`);

  const mMap = new Map((matches ?? []).map((m: any) => [m.id, m]));

  let settled = 0;
  let pushed = 0;
  const now = new Date().toISOString();

  for (const w of wagers as any[]) {
    const m = mMap.get(w.match_id);
    if (!m || m.status !== 'FINISHED') continue;
    const winnerCode: string | null = m.winner ?? m.raw?.score?.winner ?? null;
    if (!winnerCode) continue;

    let winner_player_id: number | null = null;
    let newStatus: 'won' | 'push' = 'won';

    if (winnerCode === 'HOME_TEAM') {
      winner_player_id = w.player_a_id;
    } else if (winnerCode === 'AWAY_TEAM') {
      winner_player_id = w.player_b_id;
    } else if (winnerCode === 'DRAW') {
      winner_player_id = null;
      newStatus = 'push';
    } else {
      continue;
    }

    const { error: upErr } = await db.from('wagers').update({
      status: newStatus,
      winner_player_id,
      settled_at: now,
    }).eq('id', w.id);
    if (upErr) {
      console.error(`settle wager ${w.id}: ${upErr.message}`);
      continue;
    }
    if (newStatus === 'won') settled++; else pushed++;
  }

  return { settled, pushed };
}
