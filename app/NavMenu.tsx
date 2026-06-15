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

export default function NavMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const inLeague = LEAGUE_LINKS.some(l => pathname === l.href || pathname.startsWith(l.href + '/'));

  return (
    <nav className="flex items-center gap-4 text-sm">
      <Link href="/" className="hover:gold-bright">Home</Link>

      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          className={`flex items-center gap-1 hover:gold-bright ${inLeague ? 'gold-bright' : ''}`}
        >
          League
          <svg
            width="10" height="10" viewBox="0 0 10 10"
            className={`transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          >
            <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-44 rounded-lg border border-line bg-elev shadow-xl z-50 overflow-hidden"
          >
            {LEAGUE_LINKS.map(l => {
              const active = pathname === l.href || pathname.startsWith(l.href + '/');
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  role="menuitem"
                  className={`block px-4 py-2 text-sm hover:bg-card hover:gold-bright ${active ? 'gold-bright' : ''}`}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Link href="/admin" className="hover:gold-bright text-[color:var(--text-dim)]">Admin</Link>
    </nav>
  );
}
