'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

const LEAGUE_LINKS = [
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/today',       label: 'Today' },
  { href: '/draft',       label: 'Draft' },
  { href: '/rankings',    label: 'Rankings' },
  { href: '/wagers',      label: 'Wagers' },
  { href: '/rules',       label: 'Rules' },
];

type SportMenu = {
  key: string;
  label: string;
  enabled: boolean;
  matchPrefix?: string;
};

const SPORT_MENUS: SportMenu[] = [
  { key: 'wc',  label: 'World Cup', enabled: true,  matchPrefix: '/leaderboard|/today|/draft|/rankings|/odds|/wagers|/rules' },
  { key: 'nfl', label: 'NFL',       enabled: false },
  { key: 'mlb', label: 'MLB',       enabled: false },
  { key: 'nba', label: 'NBA',       enabled: false },
];

export default function NavMenu() {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => { setOpenKey(null); setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    if (!openKey && !mobileOpen) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpenKey(null);
        setMobileOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpenKey(null); setMobileOpen(false); }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [openKey, mobileOpen]);

  const inLeague = LEAGUE_LINKS.some(l => pathname === l.href || pathname.startsWith(l.href + '/'));

  return (
    <nav ref={ref} className="relative">
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setMobileOpen(v => !v)}
        aria-label="Toggle navigation"
        aria-expanded={mobileOpen}
        className="sm:hidden flex items-center justify-center h-10 w-10 rounded-lg border border-line bg-elev hover:gold-bright"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {mobileOpen ? (
            <>
              <path d="M5 5l12 12" />
              <path d="M17 5L5 17" />
            </>
          ) : (
            <>
              <path d="M3 6h16" />
              <path d="M3 11h16" />
              <path d="M3 16h16" />
            </>
          )}
        </svg>
      </button>

      {/* Desktop inline nav */}
      <div className="hidden sm:flex items-center gap-4 text-sm">
        <Link href="/" className="hover:gold-bright">Home</Link>

        {SPORT_MENUS.map(m => {
          const isOpen = openKey === m.key;
          const active = m.key === 'wc' && inLeague;
          return (
            <div key={m.key} className="relative">
              <button
                type="button"
                onClick={() => {
                  if (!m.enabled) return;
                  setOpenKey(isOpen ? null : m.key);
                }}
                aria-expanded={isOpen}
                aria-haspopup="menu"
                disabled={!m.enabled}
                title={m.enabled ? undefined : 'Coming Soon'}
                className={`flex items-center gap-1 ${
                  m.enabled
                    ? `hover:gold-bright ${active ? 'gold-bright' : ''}`
                    : 'text-[color:var(--text-dim)] opacity-50 cursor-not-allowed'
                }`}
              >
                {m.label}
                <svg
                  width="10" height="10" viewBox="0 0 10 10"
                  className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                >
                  <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {isOpen && m.enabled && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-44 rounded-lg border border-line bg-elev shadow-xl z-50 overflow-hidden"
                >
                  {LEAGUE_LINKS.map(l => {
                    const a = pathname === l.href || pathname.startsWith(l.href + '/');
                    return (
                      <Link
                        key={l.href}
                        href={l.href}
                        role="menuitem"
                        className={`block px-4 py-2 text-sm hover:bg-card hover:gold-bright ${a ? 'gold-bright' : ''}`}
                      >
                        {l.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <Link href="/admin" className="hover:gold-bright text-[color:var(--text-dim)]">Admin</Link>
      </div>

      {/* Mobile dropdown panel */}
      {mobileOpen && (
        <div
          role="menu"
          className="sm:hidden absolute right-0 mt-2 w-60 rounded-lg border border-line bg-elev shadow-2xl z-50 overflow-hidden"
        >
          <Link href="/" className="block px-4 py-3 text-sm border-b border-line hover:bg-card hover:gold-bright">Home</Link>

          <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-widest text-[color:var(--gold)]">World Cup</div>
          {LEAGUE_LINKS.map(l => {
            const a = pathname === l.href || pathname.startsWith(l.href + '/');
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`block px-4 py-2.5 text-sm hover:bg-card hover:gold-bright ${a ? 'gold-bright' : ''}`}
              >
                {l.label}
              </Link>
            );
          })}

          <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-widest text-[color:var(--text-dim)]">Coming Soon</div>
          {SPORT_MENUS.filter(m => !m.enabled).map(m => (
            <div key={m.key} className="block px-4 py-2 text-sm text-[color:var(--text-dim)] opacity-50">
              {m.label}
            </div>
          ))}

          <Link href="/admin" className="block px-4 py-3 text-sm border-t border-line hover:bg-card hover:gold-bright text-[color:var(--text-dim)]">
            Admin
          </Link>
        </div>
      )}
    </nav>
  );
}
