export default function HomePage() {
  return (
    <div>
      {/* ============ HERO ============ */}
      <div className="mb-8 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
        <img src="/logo.png" alt="FFF League" className="h-28 w-28 sm:h-32 sm:w-32" />
        <div>
          <h1 className="text-4xl sm:text-6xl font-extrabold gold-bright tracking-tight leading-none">
            Frank&apos;s Fantasy Fútbol
          </h1>
          <p className="text-sm sm:text-base text-[color:var(--text-dim)] mt-2 uppercase tracking-widest">
            12 owners • 48 teams • 1 World Cup
          </p>
        </div>
      </div>

      {/* ============ SIDE BANNERS + BRACKET + WAGERS ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr_220px] gap-4 mb-6">
        {/* Left: upcoming sport leagues */}
        <aside className="flex flex-col gap-3 order-2 lg:order-1">
          {[
            { sport: 'NFL',  emoji: '🏈', name: 'Fantasy Football',  drop: 'Sept 2026', accent: 'from-emerald-500/15' },
            { sport: 'NBA',  emoji: '🏀', name: 'Fantasy Hoops',     drop: 'Oct 2026',  accent: 'from-orange-500/15' },
            { sport: 'MLB',  emoji: '⚾', name: 'Fantasy Diamond',   drop: 'Apr 2027',  accent: 'from-sky-500/15' },
          ].map(b => (
            <div
              key={b.sport}
              className={`rounded-xl border border-line bg-gradient-to-br ${b.accent} to-card p-3 shadow-md flex flex-col justify-between min-h-[110px] lg:min-h-0 lg:flex-1`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{b.emoji}</span>
                <span className="text-[9px] uppercase tracking-widest text-[color:var(--text-dim)] bg-elev px-2 py-0.5 rounded-full border border-line">
                  Coming Soon
                </span>
              </div>
              <div className="mt-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-dim)]">{b.sport}</div>
                <div className="font-bold gold-bright leading-tight text-sm">{b.name}</div>
              </div>
              <div className="mt-2 pt-2 border-t border-line">
                <div className="text-[9px] uppercase tracking-widest text-[color:var(--text-dim)]">Drops</div>
                <div className="text-xs font-semibold text-white">{b.drop}</div>
              </div>
            </div>
          ))}
        </aside>

        {/* Center: bracket */}
        <div className="rounded-2xl border border-line bg-card overflow-hidden shadow-2xl order-1 lg:order-2">
          <img
            src="/bracket-2026.jpg"
            alt="2026 FIFA World Cup Bracket — 48 teams, 104 matches, 1 champion"
            className="w-full h-auto block"
          />
        </div>

        {/* Right: wagers banner */}
        <aside className="rounded-xl border border-[color:var(--gold)] bg-card p-4 flex flex-col justify-center text-center shadow-lg order-3">
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
          <span className="text-white">Financial Freedom is One </span>
          <span className="gold-bright">GOAL</span>
          <span className="text-white"> Away!</span>
        </p>
        <div className="mt-6 mx-auto h-px w-32 bg-[color:var(--gold)] opacity-60" />
        <p className="mt-6 text-xs sm:text-sm text-[color:var(--text-dim)] uppercase tracking-[0.3em]">
          Champion crowned · July 19, 2026 · New York / New Jersey
        </p>
      </div>
    </div>
  );
}
