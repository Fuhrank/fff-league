import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { loadLeaderboard } from '@/lib/scoring';

export const revalidate = 60;

export default async function HomePage() {
  const rows = await loadLeaderboard(supabase);

  // Count picks to detect pre-draft state.
  const { count: picksCount } = await supabase
    .from('picks')
    .select('id', { count: 'exact', head: true });
  const preDraft = (picksCount ?? 0) === 0;

  return (
    <div>
      <div className="mb-6 flex items-center gap-5">
        <img src="/logo.png" alt="FFF League" className="hidden sm:block h-24 w-24" />
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold">Leaderboard</h1>
          <p className="text-sm text-[color:var(--text-dim)] mt-1">Updated every 15 min during match days. Ties broken by total goals.</p>
        </div>
      </div>

      {preDraft && rows.length > 0 && (
        <div className="rounded-xl border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/5 px-4 py-3 mb-5 text-sm">
          <span className="gold-bright font-semibold">Draft pending.</span>{' '}
          <span className="text-[color:var(--text-dim)]">
            {rows.length} of 12 owners signed up. Pick order + teams TBD. World Cup kicks off June 11, 2026.
          </span>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="rounded-xl border border-line bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-elev text-[color:var(--text-dim)] uppercase text-xs tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 w-12">#</th>
                <th className="text-left px-4 py-3">Owner</th>
                <th className="text-right px-4 py-3">Goals</th>
                <th className="text-right px-4 py-3">Points</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.player_id} className="border-t border-line hover:bg-elev transition-colors">
                  <td className="px-4 py-3 gold">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link href={`/player/${r.slug}`} className="hover:gold-bright font-medium">
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right text-[color:var(--text-dim)]">{r.goals}</td>
                  <td className="px-4 py-3 text-right font-bold gold-bright text-base">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-line bg-card p-10 text-center">
      <p className="text-5xl mb-3">🏆</p>
      <h2 className="text-xl font-semibold gold-bright">Draft pending</h2>
      <p className="text-sm text-[color:var(--text-dim)] mt-2 max-w-md mx-auto">
        Once the 12 owners draft their 4 teams each, the leaderboard fills in here.
        World Cup kicks off June 11, 2026.
      </p>
    </div>
  );
}
