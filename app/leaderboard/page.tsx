import { supabase } from '@/lib/supabase';
import { loadLeaderboard } from '@/lib/scoring';
import LeaderboardTabs from './LeaderboardTabs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
        <img src="/logo-v4.png" alt="Owner's League" className="hidden sm:block h-32 w-32" />
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold">Leaderboard</h1>
          <p className="text-sm text-[color:var(--text-dim)] mt-1">
            Live every couple minutes during match days. Ties broken by total goals.
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
        <LeaderboardTabs group1={group1} group2={group2} />
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
        Once owners draft their 4 teams each, the leaderboard fills in here.
        World Cup kicks off June 11, 2026.
      </p>
    </div>
  );
}
