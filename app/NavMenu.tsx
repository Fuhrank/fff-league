'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

const LEAGUE_LINKS = [
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/today',       label: 'Today' },
  { href: '/draft',       label: 'Draft' },
  { href: '/odds',        label: 'Odds' },
  { href: '/wagers',      label: 'Wagers' },
  { href: '/rules',       label: 'Rules' },
];

type SportMenu = {
  key: string;
  label: string;
  enabled: boolean;
  matchPrefix?: string; // for active-state highlighting
};

const SPORT_MENUS: SportMenu[] = [
  { key: 'wc',  label: 'World Cup', enabled: true,  matchPrefix: '/leaderboard|/today|/draft|/odds|/wagers|/rules' },
  { key: 'nfl', label: 'NFL',       enabled: false },
  { key: 'mlb', label: 'MLB',       enabled: false },
  { key: 'nba', label: 'NBA',       enabled: false },
];

export default function NavMenu() {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => { setOpenKey(null); }, [pathname]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!openKey) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenKey(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenKey(null); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [openKey]);

  const inLeague = LEAGUE_LINKS.some(l => pathname === l.href || pathname.startsWith(l.href + '/'));

  return (
    <nav ref={ref} className="flex items-center gap-3 sm:gap-4 text-sm">
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
    </nav>
  );
}
