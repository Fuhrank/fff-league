import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      player_a_id, player_b_id, stake_tokens, match_label, pick_a, pick_b, terms,
      match_id, team_a, team_b, is_open,
    } = body;

    if (!player_a_id) {
      return NextResponse.json({ error: 'Pick your name' }, { status: 400 });
    }
    if (!is_open && !player_b_id) {
      return NextResponse.json({ error: 'Pick an opponent (or check Open to anyone)' }, { status: 400 });
    }
    if (!is_open && player_a_id === player_b_id) {
      return NextResponse.json({ error: "Can't wager against yourself" }, { status: 400 });
    }
    const stake = Number(stake_tokens);
    if (!stake || stake < 1 || stake > 10000) {
      return NextResponse.json({ error: 'Stake must be 1–10,000 tokens' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.from('wagers').insert({
      player_a_id: Number(player_a_id),
      player_b_id: is_open ? null : Number(player_b_id),
      stake_tokens: stake,
      terms: (terms ?? '').toString().slice(0, 200) || 'Pick the team that will win it all',
      match_label: (match_label ?? '').toString().slice(0, 200) || null,
      pick_a: (pick_a ?? '').toString().slice(0, 80) || null,
      pick_b: is_open ? null : ((pick_b ?? '').toString().slice(0, 80) || null),
      match_id: match_id ? Number(match_id) : null,
      team_a: team_a ? String(team_a).toUpperCase().slice(0, 3) : null,
      team_b: is_open ? null : (team_b ? String(team_b).toUpperCase().slice(0, 3) : null),
      status: is_open ? 'open' : 'pending',
    }).select().single();
    if (error) throw error;

    return NextResponse.json({
      message: is_open
        ? 'Open challenge posted! Anyone can accept.'
        : 'Submitted! Awaiting admin approval.',
      wager: data,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}

export async function GET() {
  const [{ data: players }, { data: matches }, { data: teams }] = await Promise.all([
    supabaseAdmin
      .from('players')
      .select('id, name, group_no')
      .order('group_no').order('name'),
    supabaseAdmin
      .from('matches')
      .select('id, stage, utc_date, home_team, away_team, status')
      .order('utc_date'),
    supabaseAdmin
      .from('teams')
      .select('id, name, flag_emoji'),
  ]);

  const teamMap = new Map<string, { name: string; flag_emoji: string | null }>(
    (teams ?? []).map((t: any) => [t.id, { name: t.name, flag_emoji: t.flag_emoji }])
  );
  const matchOptions = (matches ?? []).map(m => {
    const home = teamMap.get(m.home_team);
    const away = teamMap.get(m.away_team);
    return {
      id: m.id,
      utc_date: m.utc_date,
      stage: m.stage,
      status: m.status,
      home_id: m.home_team,
      away_id: m.away_team,
      home_name: home?.name ?? m.home_team,
      away_name: away?.name ?? m.away_team,
      home_flag: home?.flag_emoji ?? '',
      away_flag: away?.flag_emoji ?? '',
    };
  });

  return NextResponse.json({ players: players ?? [], matches: matchOptions });
}
