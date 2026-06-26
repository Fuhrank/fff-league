import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Row = {
  team_id: string;
  p_r16: number;
  p_qf: number;
  p_sf: number;
  p_final: number;
  p_win: number;
  power_rating: number;
  tier: string;
  expected_points: number;
  sims: number;
  updated_at: string;
  team: { name: string; flag_emoji: string | null; group_letter: string | null; fifa_rank: number | null; title_odds: string | null } | null;
};

const TIER_STYLES: Record<string, string> = {
  S: 'bg-[color:var(--gold)]/20 text-[color:var(--gold)] border-[color:var(--gold)]',
  A: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/60',
  B: 'bg-sky-400/10 text-sky-300 border-sky-400/60',
  C: 'bg-violet-400/10 text-violet-300 border-violet-400/60',
  D: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/60',
};

const TIER_DESC: Record<string, string> = {
  S: 'Elite — top contenders',
  A: 'Genuine threats',
  B: 'Dark horses',
  C: 'Knockout long shots',
  D: 'Tournament tourists',
};

export default async function OddsPage() {
  const { data: rowsRaw } = await supabase
    .from('team_odds')
    .select(`
      team_id, p_r16, p_qf, p_sf, p_final, p_win,
      power_rating, tier, expected_points, sims, updated_at,
      team:teams!team_odds_team_id_fkey(name, flag_emoji, group_letter, fifa_rank, title_odds)
    `)
    .order('p_win', { ascending: false });

  const rows = (rowsRaw ?? []) as unknown as Row[];
  const sims = rows[0]?.sims ?? 0;
  const updated = rows[0]?.updated_at ? new Date(rows[0].updated_at) : null;

  // Group by tier for the summary cards
  const tiers: Record<string, Row[]> = { S: [], A: [], B: [], C: [], D: [] };
  for (const r of rows) (tiers[r.tier] ?? tiers['D']).push(r);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold gold-bright">Power Rankings & Title Odds</h1>
        <p className="text-sm text-[color:var(--text-dim)] mt-2">
          Monte Carlo simulation of the entire 2026 World Cup, calibrated to FIFA rankings + live sportsbook futures.
        </p>
        <p className="text-[10px] text-[color:var(--text-dim)] mt-1 uppercase tracking-widest">
          {sims.toLocaleString()} simulated tournaments
          {updated && ` · last updated ${updated.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
        </p>
      </div>

      {/* ============ TIER SUMMARY ============ */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-8">
        {(['S', 'A', 'B', 'C', 'D'] as const).map(t => (
          <div key={t} className={`rounded-xl border-2 ${TIER_STYLES[t]} p-3 text-center`}>
            <div className="text-3xl font-extrabold">{t}</div>
            <div className="text-[9px] uppercase tracking-widest mt-1 opacity-80">{TIER_DESC[t]}</div>
            <div className="text-[10px] mt-1">{tiers[t].length} teams</div>
          </div>
        ))}
      </div>

      {/* ============ FULL TABLE ============ */}
      <div className="rounded-xl border border-line bg-card overflow-hidden">
        <div className="grid grid-cols-[24px_1.5fr_50px_50px_60px_60px_60px_60px_60px_60px] sm:grid-cols-[32px_2fr_60px_60px_70px_70px_70px_70px_70px_70px] gap-1 sm:gap-2 px-3 sm:px-4 py-3 text-[9px] sm:text-[10px] uppercase tracking-widest text-[color:var(--text-dim)] border-b border-line font-semibold">
          <div>#</div>
          <div>Team</div>
          <div className="text-center">Grp</div>
          <div className="text-center">Tier</div>
          <div className="text-right">R16</div>
          <div className="text-right">QF</div>
          <div className="text-right">SF</div>
          <div className="text-right">Final</div>
          <div className="text-right gold-bright">Win</div>
          <div className="text-right">xPts</div>
        </div>
        {rows.map((r, i) => (
          <div
            key={r.team_id}
            className="grid grid-cols-[24px_1.5fr_50px_50px_60px_60px_60px_60px_60px_60px] sm:grid-cols-[32px_2fr_60px_60px_70px_70px_70px_70px_70px_70px] gap-1 sm:gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm border-b border-line/40 last:border-0 hover:bg-elev items-center"
          >
            <div className="text-[color:var(--text-dim)] tabular-nums">{i + 1}</div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base sm:text-lg flex-shrink-0">{r.team?.flag_emoji}</span>
              <span className="font-semibold truncate">{r.team?.name}</span>
              {r.team?.fifa_rank && (
                <span className="hidden sm:inline text-[10px] text-[color:var(--text-dim)] flex-shrink-0">
                  #{r.team.fifa_rank} FIFA
                </span>
              )}
            </div>
            <div className="text-center text-xs text-[color:var(--text-dim)]">{r.team?.group_letter ?? '—'}</div>
            <div className="text-center">
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full border text-[10px] font-bold ${TIER_STYLES[r.tier] ?? TIER_STYLES['D']}`}>
                {r.tier}
              </span>
            </div>
            <div className="text-right tabular-nums">{(r.p_r16 * 100).toFixed(1)}%</div>
            <div className="text-right tabular-nums">{(r.p_qf * 100).toFixed(1)}%</div>
            <div className="text-right tabular-nums">{(r.p_sf * 100).toFixed(1)}%</div>
            <div className="text-right tabular-nums">{(r.p_final * 100).toFixed(1)}%</div>
            <div className="text-right tabular-nums gold-bright font-bold">{(r.p_win * 100).toFixed(1)}%</div>
            <div className="text-right tabular-nums text-[color:var(--text-dim)]">{r.expected_points.toFixed(1)}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 text-[10px] text-[color:var(--text-dim)] space-y-2 leading-relaxed">
        <p>
          <span className="gold-bright font-semibold">How it works:</span> Each team gets a power rating blending FIFA ranking (40%) and live sportsbook title odds (60%). We simulate the full tournament — all 72 group-stage matches, the 32-team knockout bracket, all the way to the final — 20,000 times. The percentages above are the share of simulations where the team reached each round.
        </p>
        <p>
          <span className="gold-bright font-semibold">xPts:</span> Expected FFF League fantasy points an owner would earn for picking this team (baseline + R32/R16/QF/SF/Final/Champion bonuses, weighted by reach probability). Higher = better draft pick.
        </p>
        <p className="uppercase tracking-widest text-center pt-2">
          Methodology: Monte Carlo · Bradley-Terry win model · No vig adjustment
        </p>
      </div>
    </div>
  );
}
