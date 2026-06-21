import Link from 'next/link';
import Hero from './Hero';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function HomePage() {
  return (
    <div>
      <Hero />

      {/* ============ FEATURED SPORT BANNERS (center, glow on hover) ============ */}
      <div className="mb-8">
        <div className="text-center mb-4">
          <div className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-[color:var(--text-dim)] mb-1">
            More Leagues Coming
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold gold-bright tracking-tight">
            Own Every Season
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { sport: 'NFL', emoji: '🏈', name: 'Fantasy Football', drop: 'Sept 2026', glow: 'rgba(16,185,129,0.55)', accent: 'from-emerald-500/15', href: '/nfl/rules' },
            { sport: 'NBA', emoji: '🏀', name: 'Fantasy Hoops',    drop: 'Oct 2026',  glow: 'rgba(249,115,22,0.55)', accent: 'from-orange-500/15', href: null },
            { sport: 'MLB', emoji: '⚾', name: 'Fantasy Diamond',  drop: 'Apr 2027',  glow: 'rgba(56,189,248,0.55)', accent: 'from-sky-500/15', href: null },
          ].map(b => {
            const card = (
              <div
                className={`group relative rounded-2xl border border-line bg-gradient-to-br ${b.accent} to-card p-5 shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-[color:var(--gold)]`}
                style={{ ['--glow' as any]: b.glow }}
              >
                {/* Glow halo */}
                <div
                  className="pointer-events-none absolute -inset-1 rounded-2xl opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: `radial-gradient(60% 60% at 50% 50%, ${b.glow}, transparent 70%)` }}
                  aria-hidden
                />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="text-4xl drop-shadow">{b.emoji}</span>
                    <span className="text-[9px] uppercase tracking-widest text-[color:var(--text-dim)] bg-elev px-2 py-0.5 rounded-full border border-line">
                      Coming Soon
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--text-dim)]">{b.sport}</div>
                    <div className="font-extrabold gold-bright leading-tight text-xl">{b.name}</div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-line flex items-end justify-between">
                    <div>
                      <div className="text-[9px] uppercase tracking-widest text-[color:var(--text-dim)]">Drops</div>
                      <div className="text-sm font-semibold text-white">{b.drop}</div>
                    </div>
                    {b.href && (
                      <div className="text-[10px] uppercase tracking-widest gold-bright font-bold">
                        View Rules →
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
            return b.href ? (
              <Link key={b.sport} href={b.href} className="block">{card}</Link>
            ) : (
              <div key={b.sport}>{card}</div>
            );
          })}
        </div>
      </div>

      {/* ============ BRACKET + WAGERS ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4 mb-6">
        {/* Bracket */}
        <div className="rounded-2xl border border-line bg-card overflow-hidden shadow-2xl">
          <img
            src="/bracket-2026.jpg"
            alt="2026 FIFA World Cup Bracket — 48 teams, 104 matches, 1 champion"
            className="w-full h-auto block"
          />
        </div>

        {/* Wagers banner */}
        <aside className="rounded-xl border border-[color:var(--gold)] bg-card p-4 flex flex-col justify-center text-center shadow-lg">
          <div className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--text-dim)] mb-2">
            🎲 Place Your Bets
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold gold-bright leading-tight mb-2">
            Side Wagers Accepted
          </h2>
          <p className="text-xs text-white leading-snug mb-2">
            Pick the team that you think will win it all.
          </p>
          <div className="mx-auto h-px w-12 bg-[color:var(--gold)] opacity-60 my-2" />
          <p className="text-[10px] uppercase tracking-widest text-[color:var(--text-dim)] mb-2">
            Odds provided by
            <br />
            <span className="gold-bright font-bold text-xs">FrankPicks LLC</span>
          </p>
          <div className="mt-1 pt-2 border-t border-line">
            <p className="text-[9px] uppercase tracking-widest text-[color:var(--text-dim)] mb-1">
              Contact
            </p>
            <a
              href="mailto:OwnersLeagueLLC@gmail.com"
              className="text-[11px] gold-bright font-semibold break-all hover:underline"
            >
              OwnersLeagueLLC@gmail.com
            </a>
          </div>
        </aside>
      </div>

      {/* ============ TAGLINE ============ */}
      <div className="my-12 sm:my-20 text-center">
        <p className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight">
          <span className="text-white">Draft the Teams, </span>
          <span className="gold-bright">Own</span>
          <span className="text-white"> the League</span>
        </p>
        <div className="mt-6 mx-auto h-px w-32 bg-[color:var(--gold)] opacity-60" />
        <p className="mt-6 text-xs sm:text-sm text-[color:var(--text-dim)] uppercase tracking-[0.3em]">
          Champion crowned · July 19, 2026 · New York / New Jersey
        </p>
      </div>
    </div>
  );
}
