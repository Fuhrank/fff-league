import { supabase } from '@/lib/supabase';
import { ADVANCE_POINTS } from '@/lib/scoring';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// FFF fantasy points earned by ONE team so far.
// Mirrors lib/scoring.ts but computed per-team (not per-owner).

type Team = {
  id: string;
  name: string;
  flag_emoji: string | null;
  group_letter: string | null;
  eliminated_round: string | null;
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
  duration: string | null;
};

type Goal = {
  team_id: string;
  is_own_goal: boolean;
  is_penalty_shootout: boolean;
};

type Row = {
  team: Team;
  wins: number;
  draws: number;
  losses: number;
  goals: number;               // fantasy goal points (excl OG + shootout)
  matchPts: number;            // W*3 + D*1
  goalPts: number;             // goals
  advancePts: number;
  spoonPts: number;
  total: number;
  reached: string;             // deepest stage reached (label)
  matchesPlayed: number;
};

const STAGE_TO_ADVANCE: Record<string, string> = {
  LAST_32:        'ADVANCE_R32',
  LAST_16:        'ADVANCE_R16',
  QUARTER_FINALS: 'ADVANCE_QF',
  SEMI_FINALS:    'ADVANCE_SF',
  FINAL:          'ADVANCE_FINAL',
};

const STAGE_LABEL: Record<string, string> = {
  GROUP_STAGE:    'Group Stage',
  LAST_32:        'Round of 32',
  LAST_16:        'Round of 16',
  QUARTER_FINALS: 'Quarterfinals',
  SEMI_FINALS:    'Semifinals',
  FINAL:          'Final',
};

const ELIM_LABEL: Record<string, string> = {
  GROUP:            'Group Stage',
  R32:              'Round of 32',
  R16:              'Round of 16',
  QF:               'Quarterfinals',
  SF:               'Semifinals',
  FINAL_RUNNER_UP:  'Runner-up',
  CHAMPION:         'Champion 🏆',
};

export default async function RankingsPage() {
  const [{ data: teamsRaw }, { data: matchesRaw }, { data: goalsRaw }] = await Promise.all([
    supabase.from('teams').select('id, name, flag_emoji, group_letter, eliminated_round'),
    supabase.from('matches').select('id, stage, status, home_team, away_team, home_score, away_score, home_pk, away_pk, duration'),
    supabase.from('goals').select('team_id, is_own_goal, is_penalty_shootout'),
  ]);

  const teams  = (teamsRaw   ?? []) as Team[];
  const matches = (matchesRaw ?? []) as Match[];
  const goals  = (goalsRaw   ?? []) as Goal[];

  // Seed a row per team
  const byId = new Map<string, Row>();
  for (const t of teams) {
    byId.set(t.id, {
      team: t, wins: 0, draws: 0, losses: 0,
      goals: 0, matchPts: 0, goalPts: 0, advancePts: 0, spoonPts: 0, total: 0,
      reached: 'GROUP_STAGE', matchesPlayed: 0,
    });
  }

  // ---- W/D/L + matches played ----
  for (const m of matches) {
    if (m.status !== 'FINISHED') continue;
    const h = byId.get(m.home_team); const a = byId.get(m.away_team);
    if (!h || !a) continue;
    h.matchesPlayed++; a.matchesPlayed++;

    if (m.duration === 'PENALTY_SHOOTOUT') {
      h.draws++; a.draws++;
      h.matchPts += 1; a.matchPts += 1;
    } else if (m.home_score > m.away_score) {
      h.wins++; a.losses++; h.matchPts += 3;
    } else if (m.away_score > m.home_score) {
      a.wins++; h.losses++; a.matchPts += 3;
    } else {
      h.draws++; a.draws++;
      h.matchPts += 1; a.matchPts += 1;
    }
  }

  // ---- Goals (excl OG + shootout) ----
  for (const g of goals) {
    if (g.is_own_goal || g.is_penalty_shootout) continue;
    const r = byId.get(g.team_id);
    if (r) { r.goals++; r.goalPts++; }
  }

  // ---- Advancement (award once per team) ----
  const STAGE_RANK: Record<string, number> = {
    GROUP_STAGE: 0, LAST_32: 1, LAST_16: 2, QUARTER_FINALS: 3, SEMI_FINALS: 4, FINAL: 5,
  };
  const awarded = new Set<string>(); // `${team_id}|${kind}`
  for (const m of matches) {
    const advKind = STAGE_TO_ADVANCE[m.stage];
    if (advKind) {
      for (const tid of [m.home_team, m.away_team]) {
        const r = byId.get(tid);
        if (!r) continue;
        const key = `${tid}|${advKind}`;
        if (awarded.has(key)) continue;
        awarded.add(key);
        r.advancePts += ADVANCE_POINTS[advKind];
        if ((STAGE_RANK[m.stage] ?? 0) > (STAGE_RANK[r.reached] ?? 0)) r.reached = m.stage;
      }
    }
    // Champion bonus
    if (m.stage === 'FINAL' && m.status === 'FINISHED') {
      let champ: string | null = null;
      if (m.duration === 'PENALTY_SHOOTOUT') {
        if ((m.home_pk ?? 0) > (m.away_pk ?? 0)) champ = m.home_team;
        else if ((m.away_pk ?? 0) > (m.home_pk ?? 0)) champ = m.away_team;
      } else if (m.home_score > m.away_score) champ = m.home_team;
      else if (m.away_score > m.home_score) champ = m.away_team;
      if (champ) {
        const r = byId.get(champ);
        if (r) r.advancePts += ADVANCE_POINTS.CHAMPION;
      }
    }
  }

  // ---- Wooden spoon (safe to include now — group stage is over) ----
  // Rank teams by matches played ascending; bottom 10 get +10, bottom 2 get +20 (stack).
  const spoonRanked = [...byId.values()].sort(
    (a, b) => a.matchesPlayed - b.matchesPlayed || a.goals - b.goals
  );
  spoonRanked.slice(0, 10).forEach(r => { r.spoonPts += 10; });
  spoonRanked.slice(0, 2).forEach(r  => { r.spoonPts += 20; });

  // ---- Totals + final sort ----
  const rows = [...byId.values()];
  for (const r of rows) r.total = r.matchPts + r.goalPts + r.advancePts + r.spoonPts;
  rows.sort((a, b) =>
    b.total - a.total ||
    b.goals - a.goals ||
    a.team.name.localeCompare(b.team.name)
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold gold-bright">Team Rankings</h1>
        <p className="text-sm text-[color:var(--text-dim)] mt-2">
          All 48 World Cup teams ranked by FFF fantasy points earned so far. Ties broken by goals scored.
        </p>
      </div>

      <div className="rounded-xl border border-line bg-card overflow-hidden">
        <div className="grid grid-cols-[28px_1.4fr_44px_44px_44px_44px_50px_50px_50px_60px] sm:grid-cols-[36px_2fr_50px_50px_50px_50px_60px_60px_60px_72px] gap-1 sm:gap-2 px-3 sm:px-4 py-3 text-[9px] sm:text-[10px] uppercase tracking-widest text-[color:var(--text-dim)] border-b border-line font-semibold">
          <div>#</div>
          <div>Team</div>
          <div className="text-center">W</div>
          <div className="text-center">D</div>
          <div className="text-center">L</div>
          <div className="text-center">G</div>
          <div className="text-right">Match</div>
          <div className="text-right">Adv</div>
          <div className="text-right">Spoon</div>
          <div className="text-right gold-bright">Total</div>
        </div>
        {rows.map((r, i) => {
          const elim = !!r.team.eliminated_round && r.team.eliminated_round !== 'CHAMPION';
          const isChamp = r.team.eliminated_round === 'CHAMPION';
          const rankStyle =
            i === 0 ? 'text-[color:var(--gold)] font-bold' :
            i < 3   ? 'text-[color:var(--gold)]/70 font-bold' :
            'text-[color:var(--text-dim)]';
          return (
            <div
              key={r.team.id}
              className="grid grid-cols-[28px_1.4fr_44px_44px_44px_44px_50px_50px_50px_60px] sm:grid-cols-[36px_2fr_50px_50px_50px_50px_60px_60px_60px_72px] gap-1 sm:gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm border-b border-line/40 last:border-0 hover:bg-elev items-center"
            >
              <div className={`tabular-nums ${rankStyle}`}>{i + 1}</div>
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-base sm:text-lg flex-shrink-0 ${elim ? 'grayscale opacity-60' : ''}`}>
                  {r.team.flag_emoji}
                </span>
                <span className={`font-semibold truncate ${elim ? 'text-[color:var(--text-dim)] line-through decoration-red-500/70' : ''}`}>
                  {r.team.name}
                </span>
                {isChamp && <span className="text-xs">🏆</span>}
                <span className="hidden sm:inline text-[10px] text-[color:var(--text-dim)] flex-shrink-0">
                  {r.team.group_letter ? `Grp ${r.team.group_letter}` : ''}
                  {r.team.eliminated_round && r.team.eliminated_round !== 'CHAMPION'
                    ? ` · Out: ${ELIM_LABEL[r.team.eliminated_round] ?? r.team.eliminated_round}`
                    : ` · ${STAGE_LABEL[r.reached]}`}
                </span>
              </div>
              <div className="text-center tabular-nums text-emerald-300/90">{r.wins}</div>
              <div className="text-center tabular-nums text-zinc-300/90">{r.draws}</div>
              <div className="text-center tabular-nums text-red-300/70">{r.losses}</div>
              <div className="text-center tabular-nums">{r.goals}</div>
              <div className="text-right tabular-nums text-[color:var(--text-dim)]">{r.matchPts + r.goalPts}</div>
              <div className="text-right tabular-nums text-[color:var(--text-dim)]">{r.advancePts || '—'}</div>
              <div className="text-right tabular-nums text-[color:var(--text-dim)]">{r.spoonPts || '—'}</div>
              <div className="text-right tabular-nums gold-bright font-bold">{r.total}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 text-[10px] text-[color:var(--text-dim)] space-y-2 leading-relaxed">
        <p>
          <span className="gold-bright font-semibold">Scoring:</span> Win +3, Draw +1, Goal +1 (own goals & shootout goals excluded).
          Advancement: R32 +5, R16 +6, QF +7, SF +8, Final +9, Champion +10.
        </p>
        <p>
          <span className="gold-bright font-semibold">Wooden spoon:</span> The 10 teams with the fewest matches played get +10; the bottom 2 also get an additional +20 (so a bottom-2 team = +30 total). Applied globally across all 48 teams (not per league) — this page is a team-level view.
        </p>
        <p>
          <span className="gold-bright font-semibold">Tiebreaker:</span> Goals scored (excl. own goals & shootouts).
        </p>
      </div>
    </div>
  );
}
