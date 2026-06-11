import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      player_a_id, player_b_id, stake_tokens, match_label, pick_a, pick_b, terms,
    } = body;

    if (!player_a_id || !player_b_id) {
      return NextResponse.json({ error: 'Pick both players' }, { status: 400 });
    }
    if (player_a_id === player_b_id) {
      return NextResponse.json({ error: "Can't wager against yourself" }, { status: 400 });
    }
    const stake = Number(stake_tokens);
    if (!stake || stake < 1 || stake > 10000) {
      return NextResponse.json({ error: 'Stake must be 1–10,000 tokens' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.from('wagers').insert({
      player_a_id: Number(player_a_id),
      player_b_id: Number(player_b_id),
      stake_tokens: stake,
      terms: (terms ?? '').toString().slice(0, 200) || 'Pick the team that will win it all',
      match_label: (match_label ?? '').toString().slice(0, 200) || null,
      pick_a: (pick_a ?? '').toString().slice(0, 80) || null,
      pick_b: (pick_b ?? '').toString().slice(0, 80) || null,
      status: 'pending',
    }).select().single();
    if (error) throw error;

    return NextResponse.json({ message: 'Submitted! Awaiting admin approval.', wager: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}

export async function GET() {
  // Public list of players for the propose form
  const { data } = await supabaseAdmin
    .from('players')
    .select('id, name, group_no')
    .order('group_no').order('name');
  return NextResponse.json({ players: data ?? [] });
}
