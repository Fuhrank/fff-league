'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Slide = {
  key: string;
  sport: string;
  tagline: string;
  status: string;
  statusDot: string;
  cta: string;
  href: string | null;
  emoji: string;
  bgA: string;
  bgB: string;
  ring: string;
};

const SLIDES: Slide[] = [
  {
    key: 'wc',
    sport: 'World Cup',
    tagline: 'Draft the Teams, Own the Tournament',
    status: 'Live Now',
    statusDot: 'bg-red-500 animate-pulse',
    cta: 'View Leaderboard',
    href: '/leaderboard',
    emoji: '⚽',
    bgA: 'radial-gradient(60% 80% at 20% 20%, rgba(212,175,55,0.45), transparent 60%)',
    bgB: 'radial-gradient(60% 80% at 90% 90%, rgba(220,38,38,0.30), transparent 60%)',
    ring: 'rgba(212,175,55,0.5)',
  },
  {
    key: 'nfl',
    sport: 'NFL',
    tagline: 'Draft the Teams, Own the Gridiron',
    status: 'Drops Sept 2026',
    statusDot: 'bg-emerald-400',
    cta: 'View Rules',
    href: '/nfl/rules',
    emoji: '🏈',
    bgA: 'radial-gradient(60% 80% at 20% 20%, rgba(16,185,129,0.45), transparent 60%)',
    bgB: 'radial-gradient(60% 80% at 90% 90%, rgba(5,150,105,0.30), transparent 60%)',
    ring: 'rgba(16,185,129,0.5)',
  },
  {
    key: 'nba',
    sport: 'NBA',
    tagline: 'Draft the Teams, Own the Court',
    status: 'Drops Oct 2026',
    statusDot: 'bg-orange-400',
    cta: 'Coming Soon',
    href: null,
    emoji: '🏀',
    bgA: 'radial-gradient(60% 80% at 20% 20%, rgba(249,115,22,0.45), transparent 60%)',
    bgB: 'radial-gradient(60% 80% at 90% 90%, rgba(234,88,12,0.30), transparent 60%)',
    ring: 'rgba(249,115,22,0.5)',
  },
  {
    key: 'mlb',
    sport: 'MLB',
    tagline: 'Draft the Teams, Own the Diamond',
    status: 'Drops Apr 2027',
    statusDot: 'bg-sky-400',
    cta: 'Coming Soon',
    href: null,
    emoji: '⚾',
    bgA: 'radial-gradient(60% 80% at 20% 20%, rgba(56,189,248,0.45), transparent 60%)',
    bgB: 'radial-gradient(60% 80% at 90% 90%, rgba(2,132,199,0.30), transparent 60%)',
    ring: 'rgba(56,189,248,0.5)',
  },
];

const ROTATE_MS = 5000;

export default function SportCarousel() {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIdx(i => (i + 1) % SLIDES.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [paused]);

  const go = (i: number) => setIdx(((i % SLIDES.length) + SLIDES.length) % SLIDES.length);

  return (
    <div
      className="relative overflow-hidden rounded-3xl border bg-card shadow-2xl transition-colors duration-700"
      style={{ borderColor: SLIDES[idx].ring }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slide track */}
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${idx * 100}%)` }}
      >
        {SLIDES.map(s => (
          <div key={s.key} className="w-full flex-shrink-0 relative">
            {/* Layered gradient mesh background */}
            <div aria-hidden className="absolute inset-0" style={{ background: s.bgA }} />
            <div aria-hidden className="absolute inset-0" style={{ background: s.bgB }} />
            <div aria-hidden className="absolute inset-0 opacity-[0.04]" style={{
              backgroundImage: 'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }} />

            {/* Content */}
            <div className="relative px-6 sm:px-10 py-7 sm:py-10 min-h-[18rem] sm:min-h-[22rem] flex flex-col justify-between">
              {/* Top row */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-white/70 font-semibold">
                  Owner&apos;s League
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/40 backdrop-blur px-3 py-1 text-[10px] sm:text-xs uppercase tracking-widest text-white font-semibold">
                  <span className={`h-1.5 w-1.5 rounded-full ${s.statusDot}`} />
                  {s.status}
                </span>
              </div>

              {/* Middle: sport + tagline + emoji */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2
                    className="font-display tracking-wide leading-[1.05] title-treatment"
                    style={{ fontSize: 'clamp(2.5rem, 8vw, 5.5rem)' }}
                  >
                    {s.sport}
                  </h2>
                  <p className="mt-3 text-sm sm:text-base text-white font-bold uppercase tracking-[0.2em]">
                    {s.tagline}
                  </p>
                </div>
                <div
                  aria-hidden
                  className="text-7xl sm:text-9xl opacity-25 select-none drop-shadow-2xl"
                  style={{ filter: `drop-shadow(0 0 30px ${s.ring})` }}
                >
                  {s.emoji}
                </div>
              </div>

              {/* CTA */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex gap-1.5">
                  {SLIDES.map((sl, i) => (
                    <button
                      key={sl.key}
                      onClick={() => go(i)}
                      aria-label={`Show ${sl.sport}`}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        i === idx ? 'w-8 bg-[color:var(--gold)]' : 'w-2 bg-white/30 hover:bg-white/60'
                      }`}
                    />
                  ))}
                </div>

                {s.href ? (
                  <Link
                    href={s.href}
                    className="group inline-flex items-center gap-2 rounded-full bg-[color:var(--gold)] px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-widest text-black shadow-lg transition-all hover:bg-[color:var(--gold-bright)] hover:-translate-y-0.5"
                  >
                    {s.cta}
                    <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 backdrop-blur px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-widest text-white/70 cursor-not-allowed">
                    {s.cta}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Prev / Next arrows */}
      <button
        onClick={() => go(idx - 1)}
        aria-label="Previous sport"
        className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-black/40 backdrop-blur border border-white/20 text-white text-lg leading-none hover:bg-black/60 hover:border-[color:var(--gold)] transition-all"
      >
        ‹
      </button>
      <button
        onClick={() => go(idx + 1)}
        aria-label="Next sport"
        className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-black/40 backdrop-blur border border-white/20 text-white text-lg leading-none hover:bg-black/60 hover:border-[color:var(--gold)] transition-all"
      >
        ›
      </button>
    </div>
  );
}
