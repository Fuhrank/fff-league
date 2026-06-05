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

      {/* ============ BRACKET ============ */}
      <div className="rounded-2xl border border-line bg-card overflow-hidden mb-10 shadow-2xl">
        <img
          src="/bracket-2026.jpg"
          alt="2026 FIFA World Cup Bracket — 48 teams, 104 matches, 1 champion"
          className="w-full h-auto block"
        />
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
