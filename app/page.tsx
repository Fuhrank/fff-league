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

      {/* ============ BRACKET + SIDE BANNER ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4 mb-6">
        <div className="rounded-2xl border border-line bg-card overflow-hidden shadow-2xl">
          <img
            src="/bracket-2026.jpg"
            alt="2026 FIFA World Cup Bracket — 48 teams, 104 matches, 1 champion"
            className="w-full h-auto block"
          />
        </div>

        {/* ============ SIDE WAGERS BANNER ============ */}
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

      {/* ============ SPONSOR BANNER ============ */}
      <div className="my-6 rounded-xl border border-[color:var(--gold)] bg-card overflow-hidden shadow-lg max-w-2xl mx-auto">
        <div className="flex flex-row items-center gap-4 p-4">
          <img
            src="/marvelous-megan.svg"
            alt="Marvelous Megan"
            className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 drop-shadow-lg"
          />
          <div className="flex-1 text-left">
            <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.3em] text-[color:var(--text-dim)] mb-1">
              ✨ Proudly Presented By
            </p>
            <h2 className="text-sm sm:text-lg font-extrabold leading-tight">
              <span className="text-white">Thank you to our biggest sponsor, </span>
              <span className="gold-bright">Marvelous Megan</span>
            </h2>
          </div>
        </div>
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
