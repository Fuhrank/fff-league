import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { recomputeScoring } from '@/lib/scoring';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/draft?group=1  → public read of draft state
export async function GET(req: NextRequest) {
  const group = Number(req.nextUrl.searchParams.get('group') ?? '1');

  const [{ data: players }, { data: picks }, { data: setting }, { data: teams }] = await Promise.all([
    supabase.from('players').select('id, name, slug, group_no').eq('group_no', group).order('name'),
    supabase.from('picks').select('player_id, team_id, pick_order').in('player_id',
      (await supabase.from('players').select('id').eq('group_no', group)).data?.map(p => p.id) ?? [-1]
    ),
    supabase.from('settings').select('value').eq('key', `draft_${group}`).maybeSingle(),
    supabase.from('teams').select('id, name, flag_emoji').order('name'),
  ]);

  const cfg = (setting?.value as any) ?? { order: null, rounds: 4, status: 'pending' };

  // Compute "on the clock" if drafting
  let onTheClock: number | null = null;
  let pickNumber = 0;
  if (cfg.status === 'drafting' && cfg.order && Array.isArray(cfg.order)) {
    const n = picks?.length ?? 0;
    const rounds = cfg.rounds ?? 4;
    const orderLen = cfg.order.length;
    if (n >= orderLen * rounds) {
      onTheClock = null;
    } else {
      const round = Math.floor(n / orderLen); // 0-indexed
      const posInRound = n % orderLen;
      const idx = round % 2 === 0 ? posInRound : orderLen - 1 - posInRound;
      onTheClock = cfg.order[idx];
      pickNumber = n + 1;
    }
  }

  return NextResponse.json({
    group,
    players,
    teams,
    picks: picks ?? [],
    order: cfg.order,
    rounds: cfg.rounds ?? 4,
    status: cfg.status ?? 'pending',
    onTheClock,
    pickNumber,
  });
}

// POST /api/draft  → admin actions (password required)
export async function POST(req: NextRequest) {
  const pw = req.headers.get('x-admin-pw');
  if (pw !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  const { action, group } = body;
  const g = Number(group);
  if (!g) return NextResponse.json({ error: 'group required' }, { status: 400 });

  try {
    switch (action) {
      case 'set_order': {
        const { order, rounds } = body;
        if (!Array.isArray(order) || order.length === 0) {
          return NextResponse.json({ error: 'order must be a non-empty array' }, { status: 400 });
        }
        const value = { order, rounds: Number(rounds) || 4, status: 'drafting' };
        const { error } = await supabaseAdmin.from('settings').upsert({ key: `draft_${g}`, value });
        if (error) throw error;
        return NextResponse.json({ message: 'order saved, draft started', ...value });
      }
      case 'make_pick': {
        const { player_id, team_id } = body;
        if (!player_id || !team_id) {
          return NextResponse.json({ error: 'player_id + team_id required' }, { status: 400 });
        }
        // Verify it's actually their turn
        const { data: setting } = await supabaseAdmin
          .from('settings').select('value').eq('key', `draft_${g}`).maybeSingle();
        const cfg = (setting?.value as any) ?? null;
        if (!cfg || cfg.status !== 'drafting') {
          return NextResponse.json({ error: 'draft not active for this group' }, { status: 400 });
        }
        const { data: groupPlayers } = await supabaseAdmin
          .from('players').select('id').eq('group_no', g);
        const ids = (groupPlayers ?? []).map(p => p.id);
        const { data: existingPicks } = await supabaseAdmin
          .from('picks').select('player_id, team_id').in('player_id', ids.length ? ids : [-1]);
        const n = existingPicks?.length ?? 0;
        const orderLen = cfg.order.length;
        const round = Math.floor(n / orderLen);
        const posInRound = n % orderLen;
        const idx = round % 2 === 0 ? posInRound : orderLen - 1 - posInRound;
        const onClock = cfg.order[idx];
        if (Number(player_id) !== onClock) {
          return NextResponse.json({ error: `not on the clock (expected player ${onClock}, got ${player_id})` }, { status: 400 });
        }
        // Team must not already be picked in THIS group
        if ((existingPicks ?? []).some(p => p.team_id === team_id)) {
          return NextResponse.json({ error: 'team already picked in this group' }, { status: 400 });
        }
        // pick_order = how many teams that player already has + 1
        const ownerTeamCount = (existingPicks ?? []).filter(p => p.player_id === Number(player_id)).length;
        const { error } = await supabaseAdmin.from('picks').insert({
          player_id: Number(player_id), team_id, pick_order: ownerTeamCount + 1,
        });
        if (error) throw error;

        // Mark complete if done
        const newN = n + 1;
        if (newN >= orderLen * (cfg.rounds ?? 4)) {
          await supabaseAdmin.from('settings').upsert({
            key: `draft_${g}`, value: { ...cfg, status: 'complete' },
          });
        }
        await recomputeScoring(supabaseAdmin);
        return NextResponse.json({ message: 'pick saved', pick_number: newN });
      }
      case 'undo_last': {
        const { data: groupPlayers } = await supabaseAdmin
          .from('players').select('id').eq('group_no', g);
        const ids = (groupPlayers ?? []).map(p => p.id);
        const { data: lastPick } = await supabaseAdmin
          .from('picks').select('id, player_id, team_id, pick_order').in('player_id', ids.length ? ids : [-1])
          .order('id', { ascending: false }).limit(1).maybeSingle();
        if (!lastPick) return NextResponse.json({ error: 'no picks to undo' }, { status: 400 });
        await supabaseAdmin.from('picks').delete().eq('id', lastPick.id);
        // Reopen status if it had been completed
        const { data: setting } = await supabaseAdmin
          .from('settings').select('value').eq('key', `draft_${g}`).maybeSingle();
        const cfg = (setting?.value as any);
        if (cfg && cfg.status === 'complete') {
          await supabaseAdmin.from('settings').upsert({ key: `draft_${g}`, value: { ...cfg, status: 'drafting' } });
        }
        await recomputeScoring(supabaseAdmin);
        return NextResponse.json({ message: `undid ${lastPick.team_id}` });
      }
      case 'reset': {
        const { data: groupPlayers } = await supabaseAdmin
          .from('players').select('id').eq('group_no', g);
        const ids = (groupPlayers ?? []).map(p => p.id);
        await supabaseAdmin.from('picks').delete().in('player_id', ids.length ? ids : [-1]);
        await supabaseAdmin.from('settings').delete().eq('key', `draft_${g}`);
        await recomputeScoring(supabaseAdmin);
        return NextResponse.json({ message: 'draft reset (all picks for this group wiped)' });
      }
      default:
        return NextResponse.json({ error: 'unknown action' }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
