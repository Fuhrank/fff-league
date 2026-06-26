import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PlayerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { data: player } = await supabase
    .from('players').select('id, name, slug').eq('slug', slug).single();
  if (!player) notFound();

  const [{ data: picks }, { data: events }] = await Promise.all([
    supabase.from('picks').select('team_id, pick_order, teams(name, flag_emoji, eliminated_round)').eq('player_id', player.id).order('pick_order'),
    supabase.from('scoring_events').select('team_id, kind, points, detail').eq('player_id', player.id),
  ]);

  const total = (events ?? []).reduce((s, e) => s + e.points, 0);
  const goals = (events ?? []).filter(e => e.kind === 'GOAL').reduce((s, e) => s + e.points, 0);

  const byTeam = new Map<string, { wins: number; draws: number; goals: number; advance: number; bonus: number; total: number }>();
  for (const e of events ?? []) {
    const t = byTeam.get(e.team_id) ?? { wins: 0, draws: 0, goals: 0, advance: 0, bonus: 0, total: 0 };
    if (e.kind === 'WIN')   t.wins   += e.points;
    else if (e.kind === 'DRAW')  t.draws  += e.points;
    else if (e.kind === 'GOAL')  t.goals  += e.points;
    else if (e.kind.startsWith('WOODEN')) t.bonus += e.points;
    else t.advance += e.points;
    t.total += e.points;
    byTeam.set(e.team_id, t);
  }

  return (
    <div>
      <Link href="/leaderboard" className="text-sm text-[color:var(--text-dim)] hover:gold-bright">← Leaderboard</Link>
      <div className="mt-3 mb-8 flex items-end justify-between">
        <h1 className="text-3xl sm:text-4xl font-bold">{player.name}</h1>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider text-[color:var(--text-dim)]">Points</div>
          <div className="text-4xl font-black gold-bright leading-none">{total}</div>
          <div className="text-xs text-[color:var(--text-dim)] mt-1">{goals} goals (tiebreak)</div>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-3">Teams</h2>
      {(!picks || picks.length === 0) ? (
        <div className="rounded-xl border border-line bg-card p-6 text-sm text-[color:var(--text-dim)]">
          No picks recorded yet. Owner's 4 teams will appear once the draft is logged.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {picks.map((p: any) => {
            const t = byTeam.get(p.team_id) ?? { wins: 0, draws: 0, goals: 0, advance: 0, bonus: 0, total: 0 };
            const team = Array.isArray(p.teams) ? p.teams[0] : p.teams;
            return (
              <div key={p.team_id} className="rounded-xl border border-line bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{team?.flag_emoji}</span>
                    <span className="font-semibold">{team?.name ?? p.team_id}</span>
                  </div>
                  <span className="text-xl font-bold gold-bright">{t.total}</span>
                </div>
                <div className="grid grid-cols-5 gap-2 text-xs text-center text-[color:var(--text-dim)]">
                  <Stat label="W" value={t.wins} />
                  <Stat label="D" value={t.draws} />
                  <Stat label="G" value={t.goals} />
                  <Stat label="Adv" value={t.advance} />
                  <Stat label="Bonus" value={t.bonus} />
                </div>
                {team?.eliminated_round && team.eliminated_round !== 'CHAMPION' && (
                  <p className="text-xs text-[color:var(--text-dim)] mt-3">Eliminated: {team.eliminated_round}</p>
                )}
                {team?.eliminated_round === 'CHAMPION' && (
                  <p className="text-xs gold-bright mt-3">🏆 Champion</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider">{label}</div>
      <div className="text-sm gold-bright font-semibold">{value}</div>
    </div>
  );
}
