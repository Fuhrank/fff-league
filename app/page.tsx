import Hero from './Hero';
import ScoreTicker from './ScoreTicker';
import SportCarousel from './SportCarousel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function HomePage() {
  return (
    <div className="flex flex-col gap-4">
      <ScoreTicker />

      <Hero />

      <SportCarousel />

      {/* ============ BRACKET + WAGERS ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4">
        {/* Bracket */}
        <div className="rounded-3xl border border-line bg-card overflow-hidden shadow-2xl">
          <img
            src="/bracket-2026.jpg"
            alt="2026 FIFA World Cup Bracket — 48 teams, 104 matches, 1 champion"
            className="w-full h-auto block"
          />
        </div>

        {/* Wagers banner */}
        <aside className="rounded-3xl border border-[color:var(--gold)] bg-card p-4 flex flex-col justify-center text-center shadow-lg">
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

      {/* ============ TAGLINE (full-bleed card, no empty gaps) ============ */}
      <section className="relative overflow-hidden rounded-3xl border border-line bg-card shadow-2xl">
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-72 w-[36rem] rounded-full bg-[color:var(--gold)]/10 blur-3xl" />
        </div>
        <div className="relative py-12 sm:py-16 px-6 text-center">
          <p className="font-display text-5xl sm:text-7xl lg:text-8xl tracking-wide leading-[1.1]">
            <span className="text-white">DRAFT THE TEAMS, </span>
            <span className="title-treatment">OWN</span>
            <span className="text-white"> THE LEAGUE</span>
          </p>
          <div className="mt-6 mx-auto h-px w-32 bg-[color:var(--gold)] opacity-60" />
          <p className="mt-6 text-xs sm:text-sm text-[color:var(--text-dim)] uppercase tracking-[0.3em]">
            Champion crowned · July 19, 2026 · New York / New Jersey
          </p>
        </div>
      </section>
    </div>
  );
}
