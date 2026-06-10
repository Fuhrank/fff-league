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
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 mb-10">
        <div className="rounded-2xl border border-line bg-card overflow-hidden shadow-2xl">
          <img
            src="/bracket-2026.jpg"
            alt="2026 FIFA World Cup Bracket — 48 teams, 104 matches, 1 champion"
            className="w-full h-auto block"
          />
        </div>

        {/* ============ SIDE WAGERS BANNER ============ */}
        <aside className="rounded-2xl border-2 border-[color:var(--gold)] bg-card p-6 flex flex-col justify-center text-center shadow-2xl">
          <div className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-dim)] mb-3">
            🎲 Place Your Bets
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold gold-bright leading-tight mb-4">
            Side Wagers Accepted
          </h2>
          <p className="text-sm sm:text-base text-white leading-relaxed mb-4">
            Pick the team that you think will win it all.
          </p>
          <div className="mx-auto h-px w-20 bg-[color:var(--gold)] opacity-60 my-3" />
          <p className="text-xs uppercase tracking-widest text-[color:var(--text-dim)] mb-4">
            Odds provided by
            <br />
            <span className="gold-bright font-bold text-sm">FrankPicks LLC</span>
          </p>
          <div className="mt-2 pt-4 border-t border-line">
            <p className="text-[10px] uppercase tracking-widest text-[color:var(--text-dim)] mb-2">
              Contact
            </p>
            <a
              href="mailto:OwnersLeagueLLC@gmail.com"
              className="text-xs sm:text-sm gold-bright font-semibold break-all hover:underline"
            >
              OwnersLeagueLLC@gmail.com
            </a>
          </div>
        </aside>
      </div>

      {/* ============ SPONSOR BANNER ============ */}
      <div className="my-10 rounded-2xl border-2 border-[color:var(--gold)] bg-card overflow-hidden shadow-2xl">
        <div className="flex flex-col sm:flex-row items-center gap-6 p-6 sm:p-8">
          <img
            src="/marvelous-megan.svg"
            alt="Marvelous Megan"
            className="h-32 w-32 sm:h-40 sm:w-40 flex-shrink-0 drop-shadow-2xl"
          />
          <div className="flex-1 text-center sm:text-left">
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.35em] text-[color:var(--text-dim)] mb-2">
              ✨ Proudly Presented By ✨
            </p>
            <h2 className="text-2xl sm:text-4xl font-extrabold leading-tight mb-2">
              <span className="text-white">Thank you to our biggest sponsor,</span>
              <br />
              <span className="gold-bright">Marvelous Megan</span>
            </h2>
            <div className="mt-3 mx-auto sm:mx-0 h-px w-24 bg-[color:var(--gold)] opacity-60" />
            <p className="text-xs sm:text-sm text-[color:var(--text-dim)] uppercase tracking-widest mt-3">
              Making this league possible
            </p>
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
