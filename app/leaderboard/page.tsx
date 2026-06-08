import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { loadLeaderboard, type LeaderboardRow } from '@/lib/scoring';

export const revalidate = 60;

export const metadata = {
  title: 'Leaderboard — FFF League',
};

export default async function LeaderboardPage() {
  const rows = await loadLeaderboard(supabase);

  const { count: picksCount } = await supabase
    .from('picks')
    .select('id', { count: 'exact', head: true });
  const preDraft = (picksCount ?? 0) === 0;

  const group1 = rows.filter(r => r.group_no === 1);
  const group2 = rows.filter(r => r.group_no === 2);

  return (
    <div>
      <div className="mb-6 flex items-center gap-5">
        <img src="/logo.png" alt="FFF League" className="hidden sm:block h-24 w-24" />
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold">Leaderboard</h1>
          <p className="text-sm text-[color:var(--text-dim)] mt-1">
            Updated every 15 min during match days. Ties broken by total goals.
          </p>
        </div>
      </div>

      {preDraft && rows.length > 0 && (
        <div className="rounded-xl border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/5 px-4 py-3 mb-5 text-sm">
          <span className="gold-bright font-semibold">Draft pending.</span>{' '}
          <span className="text-[color:var(--text-dim)]">
            {rows.length} owners signed up across both groups. World Cup kicks off June 11, 2026.
          </span>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-10">
          <GroupTable title="Group 1" subtitle={`${group1.length} owners`} rows={group1} />
          <GroupTable title="Group 2" subtitle={`${group2.length} owners`} rows={group2} />
        </div>
      )}
    </div>
  );
}

function GroupTable({ title, subtitle, rows }: { title: string; subtitle: string; rows: LeaderboardRow[] }) {
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
                    <Link href={`/player/${r.slug}`} className="hover:gold-bright font-medium">
                      {r.name}
                    </Link>
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

function EmptyState() {
  return (
    <div className="rounded-xl border border-line bg-card p-10 text-center">
      <p className="text-5xl mb-3">🏆</p>
      <h2 className="text-xl font-semibold gold-bright">Draft pending</h2>
      <p className="text-sm text-[color:var(--text-dim)] mt-2 max-w-md mx-auto">
        Once owners draft their 4 teams each, the leaderboard fills in here.
        World Cup kicks off June 11, 2026.
      </p>
    </div>
  );
}
