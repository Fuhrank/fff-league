import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export const revalidate = 3600;

type SortKey = 'rank' | 'odds';

export default async function TeamsPage({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const sp = await searchParams;
  const sort: SortKey = sp.sort === 'odds' ? 'odds' : 'rank';

  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, flag_emoji, fifa_rank, title_odds, group_letter, eliminated_round');

  const sorted = [...(teams ?? [])].sort((a, b) => {
    if (sort === 'odds') {
      return (a.title_odds ?? 9999) - (b.title_odds ?? 9999);
    }
    return (a.fifa_rank ?? 9999) - (b.fifa_rank ?? 9999);
  });

  // Get owners for each team
  const { data: picks } = await supabase
    .from('picks')
    .select('team_id, players(name, slug)');
  const ownerMap = new Map<string, { name: string; slug: string }>();
  for (const p of picks ?? []) {
    const player = Array.isArray(p.players) ? p.players[0] : p.players;
    if (player) ownerMap.set(p.team_id, player);
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-5">
        <img src="/logo.png" alt="FFF League" className="hidden sm:block h-20 w-20" />
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold">The 48</h1>
          <p className="text-sm text-[color:var(--text-dim)] mt-1">
            Every team in the 2026 World Cup, ranked.
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-5">
        <SortTab active={sort === 'odds'} href="/teams?sort=odds" label="🎲 Title odds" />
        <SortTab active={sort === 'rank'} href="/teams?sort=rank" label="🌍 FIFA rank" />
      </div>

      <div className="rounded-xl border border-line bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-elev text-[color:var(--text-dim)] uppercase text-xs tracking-wider">
            <tr>
              <th className="text-left px-3 py-3 w-10">#</th>
              <th className="text-left px-3 py-3">Team</th>
              <th className="text-right px-3 py-3 hidden sm:table-cell">FIFA</th>
              <th className="text-right px-3 py-3">Odds</th>
              <th className="text-left px-3 py-3 hidden sm:table-cell">Owner</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t, i) => {
              const owner = ownerMap.get(t.id);
              return (
                <tr key={t.id} className="border-t border-line hover:bg-elev transition-colors">
                  <td className="px-3 py-2.5 gold tabular-nums">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{t.flag_emoji}</span>
                      <span className="font-medium">{t.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right text-[color:var(--text-dim)] tabular-nums hidden sm:table-cell">
                    {t.fifa_rank ?? '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right gold-bright tabular-nums">
                    {oddsAmerican(t.title_odds)}
                  </td>
                  <td className="px-3 py-2.5 hidden sm:table-cell">
                    {owner ? (
                      <Link href={`/player/${owner.slug}`} className="text-xs hover:gold-bright text-[color:var(--text-dim)]">
                        {owner.name}
                      </Link>
                    ) : (
                      <span className="text-xs text-[color:var(--text-dim)] opacity-50">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[color:var(--text-dim)] mt-4">
        FIFA rankings from the most recent FIFA/Coca-Cola Men's World Ranking. Title odds are consensus pre-tournament futures
        (decimal converted to American). Refreshed periodically.
      </p>
    </div>
  );
}

function SortTab({ active, href, label }: { active: boolean; href: string; label: string }) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-[color:var(--gold)] text-black' : 'bg-card border border-line text-[color:var(--text-dim)] hover:gold-bright'
      }`}
    >
      {label}
    </Link>
  );
}

// Convert decimal odds (e.g. 6.0) to American (+500). Lower decimal = bigger favorite.
function oddsAmerican(dec: number | null): string {
  if (dec == null) return '—';
  if (dec >= 2) return `+${Math.round((dec - 1) * 100)}`;
  return `-${Math.round(100 / (dec - 1))}`;
}
