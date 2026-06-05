import { supabase } from '@/lib/supabase';

export const revalidate = 60;

// Marquee teams worth surfacing pre-tournament. Edit anytime.
const MARQUEE = new Set([
  'ARG','BRA','FRA','ESP','ENG','GER','POR','NED','BEL','USA',
  'MEX','URY','JPN','MAR','CRO','COL','SUI','SEN',
]);

export default async function TodayPage() {
  const now = new Date();
  const start = new Date(now); start.setUTCHours(0, 0, 0, 0);
  const end = new Date(now);   end.setUTCHours(23, 59, 59, 999);

  const [{ data: todayMatches }, { data: upcoming }, { data: teams }] = await Promise.all([
    supabase
      .from('matches')
      .select('id, stage, status, utc_date, home_team, away_team, home_score, away_score, home_pk, away_pk, duration')
      .gte('utc_date', start.toISOString())
      .lte('utc_date', end.toISOString())
      .order('utc_date'),
    supabase
      .from('matches')
      .select('id, stage, status, utc_date, home_team, away_team')
      .gt('utc_date', end.toISOString())
      .in('status', ['SCHEDULED','TIMED'])
      .order('utc_date')
      .limit(50),
    supabase.from('teams').select('id, name, flag_emoji'),
  ]);

  const teamMap = new Map((teams ?? []).map(t => [t.id, t]));

  // Pick the next ~6 marquee matches (or first 6 if none flagged).
  const marqueeUpcoming = (upcoming ?? []).filter(
    m => MARQUEE.has(m.home_team) || MARQUEE.has(m.away_team)
  ).slice(0, 6);

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-bold mb-1">Today&apos;s Matches</h1>
      <p className="text-sm text-[color:var(--text-dim)] mb-8">
        {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>

      {!todayMatches || todayMatches.length === 0 ? (
        <div className="rounded-xl border border-line bg-card p-8 text-center mb-10">
          <p className="text-5xl mb-3">⚽</p>
          <p className="gold-bright font-semibold">No matches today.</p>
          <p className="text-sm text-[color:var(--text-dim)] mt-2">
            Tournament kicks off June 11, 2026.
          </p>
        </div>
      ) : (
        <div className="space-y-3 mb-10">
          {todayMatches.map((m: any) => {
            const home = teamMap.get(m.home_team);
            const away = teamMap.get(m.away_team);
            const ko = new Date(m.utc_date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            const live = m.status === 'IN_PLAY' || m.status === 'PAUSED';
            const done = m.status === 'FINISHED';
            return (
              <div key={m.id} className="rounded-xl border border-line bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider text-[color:var(--text-dim)]">{prettyStage(m.stage)}</span>
                  <span className={`text-xs ${live ? 'text-red-400 animate-pulse' : 'text-[color:var(--text-dim)]'}`}>
                    {live ? '● LIVE' : done ? 'FT' : ko}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <TeamSide flag={home?.flag_emoji} name={home?.name ?? m.home_team} />
                  <div className="text-2xl font-bold gold-bright px-4 tabular-nums">
                    {m.home_score}<span className="text-[color:var(--text-dim)] mx-2">-</span>{m.away_score}
                  </div>
                  <TeamSide flag={away?.flag_emoji} name={away?.name ?? m.away_team} reverse />
                </div>
                {m.duration === 'PENALTY_SHOOTOUT' && (
                  <div className="text-center text-xs text-[color:var(--text-dim)] mt-2">
                    Pens: {m.home_pk}-{m.away_pk}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ============ UPCOMING MARQUEE ============ */}
      {marqueeUpcoming.length > 0 && (
        <div>
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold gold-bright">Upcoming · Marquee Matches</h2>
              <p className="text-xs text-[color:var(--text-dim)] mt-1">The big names to watch.</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {marqueeUpcoming.map((m: any) => {
              const home = teamMap.get(m.home_team);
              const away = teamMap.get(m.away_team);
              const d = new Date(m.utc_date);
              const dateStr = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
              const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
              return (
                <div key={m.id} className="rounded-xl border border-line bg-card p-4 hover:bg-elev transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-wider text-[color:var(--text-dim)]">
                      {prettyStage(m.stage)}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider gold">
                      {dateStr} · {timeStr}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <TeamSide flag={home?.flag_emoji} name={home?.name ?? m.home_team} />
                    <span className="text-xs text-[color:var(--text-dim)] px-2">vs</span>
                    <TeamSide flag={away?.flag_emoji} name={away?.name ?? m.away_team} reverse />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TeamSide({ flag, name, reverse }: { flag?: string; name: string; reverse?: boolean }) {
  return (
    <div className={`flex items-center gap-2 flex-1 min-w-0 ${reverse ? 'flex-row-reverse text-right' : ''}`}>
      <span className="text-2xl shrink-0">{flag}</span>
      <span className="font-semibold truncate">{name}</span>
    </div>
  );
}

function prettyStage(s: string) {
  return ({
    GROUP_STAGE: 'Group Stage',
    LAST_32: 'Round of 32',
    LAST_16: 'Round of 16',
    QUARTER_FINALS: 'Quarterfinals',
    SEMI_FINALS: 'Semifinals',
    FINAL: 'Final',
    THIRD_PLACE: 'Third Place',
  } as Record<string, string>)[s] ?? s;
}
