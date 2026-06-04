import { supabase } from '@/lib/supabase';

export const revalidate = 60;

export default async function TodayPage() {
  const now = new Date();
  const start = new Date(now); start.setUTCHours(0, 0, 0, 0);
  const end = new Date(now);   end.setUTCHours(23, 59, 59, 999);

  const { data: matches } = await supabase
    .from('matches')
    .select('id, stage, status, utc_date, home_team, away_team, home_score, away_score, home_pk, away_pk, duration')
    .gte('utc_date', start.toISOString())
    .lte('utc_date', end.toISOString())
    .order('utc_date');

  const { data: teams } = await supabase.from('teams').select('id, name, flag_emoji');
  const teamMap = new Map((teams ?? []).map(t => [t.id, t]));

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-bold mb-1">Today's Matches</h1>
      <p className="text-sm text-[color:var(--text-dim)] mb-8">
        {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>

      {!matches || matches.length === 0 ? (
        <div className="rounded-xl border border-line bg-card p-10 text-center">
          <p className="text-5xl mb-3">⚽</p>
          <p className="gold-bright">No matches today.</p>
          <p className="text-sm text-[color:var(--text-dim)] mt-2">Check back on a match day.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((m: any) => {
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
    </div>
  );
}

function TeamSide({ flag, name, reverse }: { flag?: string; name: string; reverse?: boolean }) {
  return (
    <div className={`flex items-center gap-2 flex-1 ${reverse ? 'flex-row-reverse text-right' : ''}`}>
      <span className="text-2xl">{flag}</span>
      <span className="font-semibold">{name}</span>
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
