import { supabase } from '@/lib/supabase';
import Link from 'next/link';

const ET_TZ = 'America/New_York';

function etDayRange(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ET_TZ, year: 'numeric', month: '2-digit', day: 'numeric',
  }).formatToParts(now);
  const y = Number(parts.find(p => p.type === 'year')!.value);
  const m = Number(parts.find(p => p.type === 'month')!.value);
  const d = Number(parts.find(p => p.type === 'day')!.value);
  const utcAsET = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
  const tzPart = new Intl.DateTimeFormat('en-US', { timeZone: ET_TZ, timeZoneName: 'shortOffset' })
    .formatToParts(new Date(utcAsET)).find(p => p.type === 'timeZoneName')?.value ?? 'GMT-5';
  const m2 = tzPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  const sign = m2 && m2[1] === '-' ? 1 : -1;
  const offsetMin = m2 ? sign * (Number(m2[2]) * 60 + Number(m2[3] ?? '0')) : 300;
  const startMs = utcAsET + offsetMin * 60_000;
  const endMs = startMs + 24 * 60 * 60 * 1000 - 1;
  return { start: new Date(startMs), end: new Date(endMs) };
}

function formatET(d: Date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: ET_TZ, hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(d) + ' ET';
}

export default async function Hero() {
  const now = new Date();
  const { start, end } = etDayRange(now);

  const [{ data: todayMatches }, { data: liveAny }] = await Promise.all([
    supabase
      .from('matches')
      .select('id, status, utc_date')
      .gte('utc_date', start.toISOString())
      .lte('utc_date', end.toISOString())
      .order('utc_date'),
    supabase
      .from('matches')
      .select('id, status, utc_date')
      .in('status', ['IN_PLAY', 'PAUSED'])
      .limit(1),
  ]);

  const totalToday = todayMatches?.length ?? 0;
  const liveCount = (liveAny?.length ?? 0) + (todayMatches?.filter(m => m.status === 'IN_PLAY' || m.status === 'PAUSED').length ?? 0);
  const nextMatch = todayMatches?.find(m => m.status === 'SCHEDULED' || m.status === 'TIMED');
  const nextTime = nextMatch ? formatET(new Date(nextMatch.utc_date)) : null;

  let pill: { dot: string; text: string };
  if (liveCount > 0) {
    pill = { dot: 'bg-red-500 animate-pulse', text: `${liveCount} match${liveCount === 1 ? '' : 'es'} live now` };
  } else if (totalToday > 0 && nextTime) {
    pill = { dot: 'bg-emerald-400', text: `${totalToday} match${totalToday === 1 ? '' : 'es'} today · Next ${nextTime}` };
  } else if (totalToday > 0) {
    pill = { dot: 'bg-[color:var(--gold)]', text: `${totalToday} match${totalToday === 1 ? '' : 'es'} today` };
  } else {
    pill = { dot: 'bg-[color:var(--gold)]', text: 'Tournament kicks off June 11, 2026' };
  }

  return (
    <section className="relative mb-10 overflow-hidden rounded-3xl border border-[color:var(--gold)]/40 bg-card shadow-2xl">
      {/* Animated gradient mesh */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-[color:var(--gold)]/15 blur-3xl animate-mesh-a" />
        <div className="absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-emerald-500/10 blur-3xl animate-mesh-b" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[22rem] w-[22rem] rounded-full bg-sky-500/10 blur-3xl animate-mesh-c" />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage:
            'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
      </div>

      <div className="relative px-6 sm:px-12 py-12 sm:py-16 text-center">
        {/* Status pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-elev/80 backdrop-blur px-4 py-1.5 text-xs sm:text-sm text-white">
          <span className={`inline-block h-2 w-2 rounded-full ${pill.dot}`} />
          <span className="uppercase tracking-widest font-semibold">{pill.text}</span>
        </div>

        {/* Logo */}
        <div className="mt-6 flex justify-center">
          <img
            src="/logo-v3.png"
            alt="Owner's League"
            className="h-28 w-28 sm:h-40 sm:w-40 drop-shadow-[0_0_24px_rgba(212,175,55,0.45)]"
          />
        </div>

        {/* Wordmark */}
        <h1 className="font-display mt-5 text-6xl sm:text-8xl tracking-wide leading-[1.1] pb-2 title-treatment">
          OWNER&apos;S LEAGUE
        </h1>

        {/* Tagline */}
        <p className="mt-2 text-base sm:text-xl font-semibold text-white/90 uppercase tracking-[0.25em]">
          Draft the Teams, <span className="gold-bright">Own</span> the League
        </p>

        {/* Stat strip */}
        <p className="mt-3 text-xs sm:text-sm text-[color:var(--text-dim)] uppercase tracking-widest">
          20 owners · 48 teams · 1 World Cup
        </p>

        {/* CTAs */}
        <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/leaderboard"
            className="group inline-flex items-center gap-2 rounded-full bg-[color:var(--gold)] px-6 py-3 text-sm font-bold uppercase tracking-widest text-black shadow-lg transition-all hover:bg-[color:var(--gold-bright)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] hover:-translate-y-0.5"
          >
            View Leaderboard
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
          <Link
            href="/rules"
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--gold)]/60 bg-elev/60 backdrop-blur px-6 py-3 text-sm font-bold uppercase tracking-widest text-white transition-all hover:border-[color:var(--gold)] hover:bg-elev"
          >
            Read the Rules
          </Link>
        </div>
      </div>
    </section>
  );
}
