import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { wager_id, player_b_id } = body;

    if (!wager_id) return NextResponse.json({ error: 'missing wager_id' }, { status: 400 });
    if (!player_b_id) return NextResponse.json({ error: 'Pick your name' }, { status: 400 });

    // Load the open wager
    const { data: w, error: wErr } = await supabaseAdmin
      .from('wagers')
      .select('id, status, player_a_id, team_a, team_b, pick_a, pick_b, match_id')
      .eq('id', wager_id)
      .single();
    if (wErr) throw wErr;
    if (!w) return NextResponse.json({ error: 'wager not found' }, { status: 404 });
    if (w.status !== 'open') {
      return NextResponse.json({ error: 'wager is no longer open' }, { status: 400 });
    }
    if (Number(player_b_id) === w.player_a_id) {
      return NextResponse.json({ error: "You proposed this wager — can't accept your own" }, { status: 400 });
    }

    // If linked to a match, accepter gets the OTHER team automatically.
    let team_b = w.team_b;
    let pick_b = w.pick_b;
    if (w.match_id && w.team_a && !w.team_b) {
      // Look up match to find which team_a represents and assign opposite.
      const { data: m } = await supabaseAdmin
        .from('matches')
        .select('home_team, away_team')
        .eq('id', w.match_id)
        .single();
      if (m) {
        const otherCode = w.team_a === m.home_team ? m.away_team : m.home_team;
        team_b = otherCode;
        // Pretty pick label
        const { data: t } = await supabaseAdmin
          .from('teams')
          .select('name, flag_emoji')
          .eq('id', otherCode)
          .single();
        if (t) pick_b = `${t.name} ${t.flag_emoji ?? ''}`.trim();
      }
    }

    const { error } = await supabaseAdmin.from('wagers').update({
      player_b_id: Number(player_b_id),
      team_b,
      pick_b,
      status: 'pending',
    }).eq('id', wager_id).eq('status', 'open'); // guard against race
    if (error) throw error;

    return NextResponse.json({ message: 'Accepted! Awaiting admin approval.' });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
