import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const ET_TZ = 'America/New_York';

function prettyStage(stage: string): string {
  const map: Record<string, string> = {
    GROUP_STAGE: 'GROUP',
    LAST_16: 'R16',
    QUARTER_FINALS: 'QF',
    SEMI_FINALS: 'SF',
    THIRD_PLACE: '3RD',
    FINAL: 'FINAL',
  };
  return map[stage] ?? stage;
}

function timeET(d: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: ET_TZ,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(d));
}

function dayET(d: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: ET_TZ,
    weekday: 'short',
  }).format(new Date(d)).toUpperCase();
}

export default async function ScoreTicker() {
  const now = new Date();
  const future = new Date(now.getTime() + 14 * 24 * 3600 * 1000).toISOString();

  const [{ data: liveMatches }, { data: upcomingMatches }, { data: teams }] = await Promise.all([
    // Anything in play right now (no date filter — late kickoffs running past midnight)
    supabase
      .from('matches')
      .select('id, stage, status, utc_date, home_team, away_team, home_score, away_score')
      .in('status', ['IN_PLAY', 'PAUSED'])
      .order('utc_date'),
    // Future scheduled matches, next 14 days
    supabase
      .from('matches')
      .select('id, stage, status, utc_date, home_team, away_team, home_score, away_score')
      .gte('utc_date', now.toISOString())
      .lte('utc_date', future)
      .in('status', ['SCHEDULED', 'TIMED'])
      .order('utc_date')
      .limit(30),
    supabase.from('teams').select('id, name, flag_emoji, tla'),
  ]);

  const teamMap = new Map((teams ?? []).map((t: any) => [t.id, t]));
  const combined = [...(liveMatches ?? []), ...(upcomingMatches ?? [])];

  const items = combined.map((m: any) => {
    const home = teamMap.get(m.home_team);
    const away = teamMap.get(m.away_team);
    const homeTag = home?.tla ?? m.home_team;
    const awayTag = away?.tla ?? m.away_team;
    const homeFlag = home?.flag_emoji ?? '';
    const awayFlag = away?.flag_emoji ?? '';
    const live = m.status === 'IN_PLAY' || m.status === 'PAUSED';
    return {
      id: m.id,
      stage: prettyStage(m.stage),
      live,
      label: live
        ? `${homeFlag} ${homeTag} ${m.home_score} - ${m.away_score} ${awayTag} ${awayFlag}`
        : `${homeFlag} ${homeTag} vs ${awayTag} ${awayFlag} · ${dayET(m.utc_date)} ${timeET(m.utc_date)} ET`,
    };
  });

  // Fallback if DB hasn't been populated yet (pre-tournament)
  if (items.length === 0) {
    items.push({
      id: 'placeholder',
      stage: 'KICKOFF',
      live: false,
      label: '🏆 TOURNAMENT KICKS OFF JUNE 11, 2026 · MEXICO CITY',
    });
  }

  // Duplicate the list so the marquee can loop seamlessly
  const loop = [...items, ...items];

  return (
    <div className="ticker-wrap rounded-2xl border border-[color:var(--gold)]/40 bg-[color:var(--bg-elev)]/80 backdrop-blur shadow-lg overflow-hidden">
      <div className="flex items-stretch">
        <div className="ticker-label shrink-0 px-4 py-2 bg-gradient-to-r from-[color:var(--gold)] to-[color:var(--gold-dim)] text-black font-extrabold text-xs sm:text-sm tracking-[0.2em] flex items-center">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500 mr-2 animate-pulse" />
          LIVE
        </div>
        <div className="ticker-track-wrap relative flex-1 overflow-hidden">
          <div className="ticker-track flex gap-8 whitespace-nowrap py-2 px-4 text-sm sm:text-base">
            {loop.map((it, i) => (
              <span key={`${it.id}-${i}`} className="inline-flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-[color:var(--gold)] font-bold">
                  {it.stage}
                </span>
                {it.live && (
                  <span className="text-[10px] font-bold text-red-400 animate-pulse">● LIVE</span>
                )}
                <span className={it.live ? 'gold-bright font-bold' : 'text-white font-semibold'}>
                  {it.label}
                </span>
                <span className="text-[color:var(--gold)]/40 px-3">•</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
