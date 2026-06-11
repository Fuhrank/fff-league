import { supabase } from '@/lib/supabase';
import AutoRefresh from './AutoRefresh';

export const revalidate = 20;

const ET_TZ = 'America/New_York';

// Marquee teams worth surfacing pre-tournament. Edit anytime.
const MARQUEE = new Set([
  'ARG','BRA','FRA','ESP','ENG','GER','POR','NED','BEL','USA',
  'MEX','URY','JPN','MAR','CRO','COL','SUI','SEN',
]);

// Compute the UTC instants corresponding to the start/end of "today" in Eastern Time.
function easternDayRange(now: Date): { start: Date; end: Date } {
  // Get the Y/M/D in ET for "now"
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ET_TZ,
    year: 'numeric',
    month: '2-digit',
    day: 'numeric',
  }).formatToParts(now);
  const y = Number(parts.find(p => p.type === 'year')!.value);
  const m = Number(parts.find(p => p.type === 'month')!.value);
  const d = Number(parts.find(p => p.type === 'day')!.value);

  // ET is UTC-5 (EST) or UTC-4 (EDT). In June 2026 it's EDT (-4).
  // We compute the UTC ms for ET-midnight by trial: build a Date as if UTC,
  // then shift by ET's offset for that date.
  const utcMidnightAsET = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
  // Find ET offset (in minutes) at that instant.
  const offsetMin = etOffsetMinutes(new Date(utcMidnightAsET));
  const startMs = utcMidnightAsET + offsetMin * 60_000;
  const endMs = startMs + 24 * 60 * 60 * 1000 - 1;
  return { start: new Date(startMs), end: new Date(endMs) };
}

// Returns ET offset behind UTC in minutes (positive number). EDT=240, EST=300.
function etOffsetMinutes(d: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: ET_TZ,
    timeZoneName: 'shortOffset',
  });
  const tzPart = dtf.formatToParts(d).find(p => p.type === 'timeZoneName')?.value ?? 'GMT-5';
  // e.g. "GMT-4" or "GMT-4:30"
  const m = tzPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!m) return 300;
  const sign = m[1] === '-' ? 1 : -1; // behind UTC = positive
  const hours = Number(m[2]);
  const mins = Number(m[3] ?? '0');
  return sign * (hours * 60 + mins);
}

function formatET(date: Date, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-US', { ...opts, timeZone: ET_TZ }).format(date);
}

export default async function TodayPage() {
  const now = new Date();
  const { start, end } = easternDayRange(now);

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

  // Bucket today's matches.
  const isLive = (s: string) => s === 'IN_PLAY' || s === 'PAUSED';
  const isDone = (s: string) => s === 'FINISHED';
  const liveMatches    = (todayMatches ?? []).filter((m: any) => isLive(m.status));
  const upcomingToday  = (todayMatches ?? []).filter((m: any) => !isLive(m.status) && !isDone(m.status));
  const finishedToday  = (todayMatches ?? []).filter((m: any) => isDone(m.status));

  // Pick the next ~6 marquee matches (or first 6 if none flagged).
  const marqueeUpcoming = (upcoming ?? []).filter(
    m => MARQUEE.has(m.home_team) || MARQUEE.has(m.away_team)
  ).slice(0, 6);

  return (
    <div>
      {liveMatches.length > 0 && <AutoRefresh />}
      <h1 className="text-3xl sm:text-4xl font-bold mb-1">Today&apos;s Matches</h1>
      <p className="text-sm text-[color:var(--text-dim)] mb-8">
        {formatET(now, { weekday: 'long', month: 'long', day: 'numeric' })} · Eastern Time
      </p>

      {/* ============ LIVE NOW ============ */}
      {liveMatches.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-xl sm:text-2xl font-bold text-red-400 tracking-wide">LIVE NOW</h2>
            <span className="text-[10px] uppercase tracking-widest text-[color:var(--text-dim)] ml-1">
              auto-refreshing every 25s
            </span>
          </div>
          <div className="space-y-3">
            {liveMatches.map((m: any) => {
              const home = teamMap.get(m.home_team);
              const away = teamMap.get(m.away_team);
              return (
                <div key={m.id} className="rounded-xl border-2 border-red-500/60 bg-gradient-to-br from-red-500/10 to-card p-5 shadow-lg shadow-red-500/10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs uppercase tracking-wider text-[color:var(--text-dim)]">{prettyStage(m.stage)}</span>
                    <span className="text-xs font-bold text-red-400 animate-pulse">● LIVE</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <TeamSide flag={home?.flag_emoji} name={home?.name ?? m.home_team} />
                    <div className="text-4xl sm:text-5xl font-extrabold gold-bright px-4 tabular-nums">
                      {m.home_score}<span className="text-[color:var(--text-dim)] mx-2">-</span>{m.away_score}
                    </div>
                    <TeamSide flag={away?.flag_emoji} name={away?.name ?? m.away_team} reverse />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!todayMatches || todayMatches.length === 0 ? (
        <div className="rounded-xl border border-line bg-card p-8 text-center mb-10">
          <p className="text-5xl mb-3">⚽</p>
          <p className="gold-bright font-semibold">No matches today.</p>
          <p className="text-sm text-[color:var(--text-dim)] mt-2">
            Tournament kicks off June 11, 2026.
          </p>
        </div>
      ) : (
        <>
          {/* ============ UPCOMING TODAY ============ */}
          {upcomingToday.length > 0 && (
            <div className="mb-10">
              <h2 className="text-xl font-bold mb-3">⏰ Coming up today</h2>
              <div className="space-y-3">
                {upcomingToday.map((m: any) => renderMatchRow(m, teamMap))}
              </div>
            </div>
          )}

          {/* ============ FINISHED TODAY ============ */}
          {finishedToday.length > 0 && (
            <div className="mb-10">
              <h2 className="text-xl font-bold mb-3">✅ Final</h2>
              <div className="space-y-3">
                {finishedToday.map((m: any) => renderMatchRow(m, teamMap))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ============ UPCOMING MARQUEE ============ */}
      {marqueeUpcoming.length > 0 && (
        <div>
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold gold-bright">Upcoming · Marquee Matches</h2>
              <p className="text-xs text-[color:var(--text-dim)] mt-1">The big names to watch. All times Eastern.</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {marqueeUpcoming.map((m: any) => {
              const home = teamMap.get(m.home_team);
              const away = teamMap.get(m.away_team);
              const d = new Date(m.utc_date);
              const dateStr = formatET(d, { weekday: 'short', month: 'short', day: 'numeric' });
              const timeStr = formatET(d, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
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

const ET_FMT = (d: Date, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-US', { ...opts, timeZone: 'America/New_York' }).format(d);

function renderMatchRow(m: any, teamMap: Map<string, any>) {
  const home = teamMap.get(m.home_team);
  const away = teamMap.get(m.away_team);
  const ko = ET_FMT(new Date(m.utc_date), { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  const done = m.status === 'FINISHED';
  return (
    <div key={m.id} className="rounded-xl border border-line bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider text-[color:var(--text-dim)]">{prettyStage(m.stage)}</span>
        <span className="text-xs text-[color:var(--text-dim)]">{done ? 'FT' : ko}</span>
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
