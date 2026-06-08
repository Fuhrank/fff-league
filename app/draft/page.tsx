import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Draft Room — FFF League' };

export default async function DraftIndex() {
  const { data: players } = await supabase.from('players').select('group_no');
  const counts: Record<number, number> = {};
  for (const p of players ?? []) counts[p.group_no] = (counts[p.group_no] ?? 0) + 1;

  const { data: settings } = await supabase.from('settings').select('key, value');
  const statusByGroup: Record<number, string> = {};
  for (const s of settings ?? []) {
    const m = /^draft_(\d+)$/.exec(s.key);
    if (m) statusByGroup[Number(m[1])] = (s.value as any)?.status ?? 'pending';
  }

  const groups = Object.keys(counts).map(Number).sort();

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-bold mb-2">Draft Room</h1>
      <p className="text-sm text-[color:var(--text-dim)] mb-8">Pick a league to enter its draft room.</p>
      <div className="grid sm:grid-cols-2 gap-4">
        {groups.map(g => {
          const s = statusByGroup[g] ?? 'pending';
          return (
            <Link key={g} href={`/draft/${g}`}
              className="rounded-xl border border-line bg-card p-5 hover:border-[color:var(--gold)] transition-colors">
              <div className="flex items-baseline justify-between mb-2">
                <h2 className="text-xl font-bold gold-bright">Group {g}</h2>
                <span className="text-[10px] uppercase tracking-widest text-[color:var(--text-dim)]">{s}</span>
              </div>
              <p className="text-sm text-[color:var(--text-dim)]">{counts[g]} owners</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
