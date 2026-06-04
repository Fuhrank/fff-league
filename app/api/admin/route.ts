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
          supabaseAdmin.from('players').select('id, name, slug').order('name'),
        ]);
        return NextResponse.json({ teams, players });
      }
      case 'add_player': {
        const { name } = body;
        const { data, error } = await supabaseAdmin
          .from('players').insert({ name, slug: slugify(name) }).select().single();
        if (error) throw error;
        return NextResponse.json({ message: `added ${name}`, player: data });
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
      default:
        return NextResponse.json({ error: 'unknown action' }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
