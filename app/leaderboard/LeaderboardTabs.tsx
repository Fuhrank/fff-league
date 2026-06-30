'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { LeaderboardRow } from '@/lib/scoring';

const GROUP_LABELS: Record<number, string> = {
  1: 'CCT Futbol League',
  2: 'Cousins League',
};

export default function LeaderboardTabs({
  group1,
  group2,
}: {
  group1: LeaderboardRow[];
  group2: LeaderboardRow[];
}) {
  const [active, setActive] = useState<1 | 2>(1);
  const rows = active === 1 ? group1 : group2;
  const count = active === 1 ? group1.length : group2.length;

  return (
    <div>
      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="League groups"
        className="inline-flex rounded-xl border border-line bg-elev p-1 mb-5 gap-1"
      >
        {[1, 2].map(n => {
          const isActive = active === n;
          const c = n === 1 ? group1.length : group2.length;
          return (
            <button
              key={n}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(n as 1 | 2)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold tracking-wide transition-colors ${
                isActive
                  ? 'bg-[color:var(--gold)]/15 gold-bright border border-[color:var(--gold)]/40'
                  : 'text-[color:var(--text-dim)] hover:text-white border border-transparent'
              }`}
            >
              {GROUP_LABELS[n]}
              <span className="ml-1.5 text-[10px] text-[color:var(--text-dim)]">({c})</span>
            </button>
          );
        })}
      </div>

      <GroupTable title={GROUP_LABELS[active]} subtitle={`${count} owners`} rows={rows} />
    </div>
  );
}

function GroupTable({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: LeaderboardRow[];
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3 px-1">
        <h2 className="text-xl sm:text-2xl font-bold gold-bright tracking-tight">{title}</h2>
        <span className="text-xs uppercase tracking-widest text-[color:var(--text-dim)]">{subtitle}</span>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-line bg-card p-6 text-center text-sm text-[color:var(--text-dim)]">
          No owners in this group yet.
        </div>
      ) : (
        <div className="rounded-xl border border-line bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-elev text-[color:var(--text-dim)] uppercase text-xs tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 w-12">#</th>
                <th className="text-left px-4 py-3">Owner</th>
                <th className="text-center px-4 py-3">Buy-in</th>
                <th className="text-right px-4 py-3">Goals</th>
                <th className="text-right px-4 py-3">Points</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.player_id} className="border-t border-line hover:bg-elev transition-colors">
                  <td className="px-4 py-3 gold">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/player/${r.slug}`} className="hover:gold-bright font-medium">
                        {r.name}
                      </Link>
                      {r.grade && <GradeBadge grade={r.grade} />}
                      {r.flags.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          {r.flags.map((f, idx) => {
                            const iso = flagEmojiToIso(f.flag);
                            const flagEl = iso ? (
                              <img
                                src={`https://flagcdn.com/24x18/${iso}.png`}
                                srcSet={`https://flagcdn.com/48x36/${iso}.png 2x`}
                                width={24}
                                height={18}
                                alt={f.name}
                                className="rounded-[2px] border border-line/60 shadow-sm"
                                loading="lazy"
                              />
                            ) : (
                              <span className="text-base leading-none">{f.flag}</span>
                            );
                            return (
                              <span
                                key={idx}
                                className="relative inline-flex items-center"
                                title={f.eliminated ? `${f.name} — eliminated` : f.name}
                              >
                                <span className={f.eliminated ? 'opacity-50' : ''}>{flagEl}</span>
                                {f.eliminated && (
                                  <span
                                    aria-label="eliminated"
                                    className="pointer-events-none absolute inset-0 flex items-center justify-center text-red-500 font-black text-base leading-none"
                                    style={{
                                      textShadow: '0 0 2px rgba(0,0,0,0.95), 0 0 1px rgba(0,0,0,0.95)',
                                      WebkitTextStroke: '0.5px rgba(0,0,0,0.6)',
                                    }}
                                  >
                                    ✕
                                  </span>
                                )}
                              </span>
                            );
                          })}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.paid ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[color:var(--gold)]/15 text-[color:var(--gold)] border border-[color:var(--gold)]/40">
                        ✓ Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/30">
                        Unpaid
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-[color:var(--text-dim)]">{r.goals}</td>
                  <td className="px-4 py-3 text-right font-bold gold-bright text-base">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  const tier = grade[0];
  const cls =
    tier === 'A' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' :
    tier === 'B' ? 'bg-[color:var(--gold)]/15 text-[color:var(--gold)] border-[color:var(--gold)]/40' :
    tier === 'C' ? 'bg-orange-500/15 text-orange-300 border-orange-500/40' :
                   'bg-red-500/15 text-red-300 border-red-500/40';
  return (
    <span
      title="Draft grade — graded within group by Vegas-implied roster strength"
      className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold border tracking-wider ${cls}`}
    >
      {grade}
    </span>
  );
}

function flagEmojiToIso(emoji: string): string | null {
  if (!emoji) return null;
  const cps = [...emoji].map(c => c.codePointAt(0) ?? 0);
  if (cps.length < 2) return null;
  const A = 0x1F1E6;
  const c1 = cps[0] - A;
  const c2 = cps[1] - A;
  if (c1 < 0 || c1 > 25 || c2 < 0 || c2 > 25) return null;
  return String.fromCharCode(97 + c1, 97 + c2);
}
