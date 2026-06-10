import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { recomputeScoring } from '@/lib/scoring';
import { syncFromFootballData } from '@/lib/football-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function POST(req: NextRequest) {
  const pw = req.headers.get('x-admin-pw');
  if (pw !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  const { action } = body;

  try {
    switch (action) {
      case 'list': {
        const [{ data: teams }, { data: players }] = await Promise.all([
          supabaseAdmin.from('teams').select('id, name, flag_emoji').order('name'),
          supabaseAdmin.from('players').select('id, name, slug, group_no, paid').order('group_no').order('name'),
        ]);
        return NextResponse.json({ teams, players });
      }
      case 'add_player': {
        const { name, group_no } = body;
        const g = group_no === 2 ? 2 : 1;
        const { data, error } = await supabaseAdmin
          .from('players').insert({ name, slug: slugify(name), group_no: g }).select().single();
        if (error) throw error;
        return NextResponse.json({ message: `added ${name} (Group ${g})`, player: data });
      }
      case 'set_player_group': {
        const { player_id, group_no } = body;
        const g = group_no === 2 ? 2 : 1;
        const { error } = await supabaseAdmin.from('players').update({ group_no: g }).eq('id', player_id);
        if (error) throw error;
        return NextResponse.json({ message: `moved to Group ${g}` });
      }
      case 'set_paid': {
        const { player_id, paid } = body;
        const { error } = await supabaseAdmin.from('players').update({ paid: !!paid }).eq('id', player_id);
        if (error) throw error;
        return NextResponse.json({ message: paid ? 'marked paid' : 'marked unpaid' });
      }
      case 'set_picks': {
        const { player_id, team_ids } = body;
        await supabaseAdmin.from('picks').delete().eq('player_id', player_id);
        const rows = (team_ids as string[]).map((tid, i) => ({
          player_id, team_id: tid, pick_order: i + 1,
        }));
        const { error } = await supabaseAdmin.from('picks').insert(rows);
        if (error) throw error;
        await recomputeScoring(supabaseAdmin);
        return NextResponse.json({ message: 'picks saved + scoring recomputed' });
      }
      case 'sync': {
        const r = await syncFromFootballData();
        await recomputeScoring(supabaseAdmin);
        return NextResponse.json({ message: `synced ${r.upserted} matches, ${r.goalRows} goals`, ...r });
      }
      case 'recompute': {
        const r = await recomputeScoring(supabaseAdmin);
        return NextResponse.json({ message: `recomputed ${r.events} events` });
      }
      case 'list_wagers': {
        const { data } = await supabaseAdmin
          .from('wagers')
          .select(`id, stake_tokens, terms, status, pick_a, pick_b, winner_player_id, player_a_id, player_b_id, created_at`)
          .order('created_at', { ascending: false });
        return NextResponse.json({ wagers: data });
      }
      case 'add_wager': {
        const { player_a_id, player_b_id, stake_tokens, terms } = body;
        if (!player_a_id || !player_b_id || player_a_id === player_b_id) {
          return NextResponse.json({ error: 'pick two different players' }, { status: 400 });
        }
        const { data, error } = await supabaseAdmin.from('wagers').insert({
          player_a_id, player_b_id,
          stake_tokens: Number(stake_tokens) || 0,
          terms: terms || 'Pick the team that will win it all',
          status: 'active',
        }).select().single();
        if (error) throw error;
        return NextResponse.json({ message: `wager created (${data.stake_tokens} tokens)`, wager: data });
      }
      case 'update_wager_picks': {
        const { wager_id, pick_a, pick_b } = body;
        const { error } = await supabaseAdmin.from('wagers')
          .update({ pick_a: pick_a ?? null, pick_b: pick_b ?? null })
          .eq('id', wager_id);
        if (error) throw error;
        return NextResponse.json({ message: 'picks updated' });
      }
      case 'settle_wager': {
        const { wager_id, winner_player_id } = body;
        const { error } = await supabaseAdmin.from('wagers')
          .update({ status: 'settled', winner_player_id: winner_player_id ?? null })
          .eq('id', wager_id);
        if (error) throw error;
        return NextResponse.json({ message: 'wager settled' });
      }
      case 'delete_wager': {
        const { wager_id } = body;
        const { error } = await supabaseAdmin.from('wagers').delete().eq('id', wager_id);
        if (error) throw error;
        return NextResponse.json({ message: 'wager deleted' });
      }
      default:
        return NextResponse.json({ error: 'unknown action' }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
