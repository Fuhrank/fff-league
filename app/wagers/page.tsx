import { supabase } from '@/lib/supabase';
import ProposeWagerForm from './ProposeWagerForm';

export const revalidate = 30;

type Wager = {
  id: string;
  stake_tokens: number;
  terms: string;
  match_label: string | null;
  status: string;
  pick_a: string | null;
  pick_b: string | null;
  winner_player_id: number | null;
  created_at: string;
  player_a: { id: number; name: string; slug: string; group_no: number } | null;
  player_b: { id: number; name: string; slug: string; group_no: number } | null;
};

export default async function WagersPage() {
  const { data: wagersRaw } = await supabase
    .from('wagers')
    .select(`
      id, stake_tokens, terms, match_label, status, pick_a, pick_b, winner_player_id, created_at,
      player_a:players!wagers_player_a_id_fkey(id, name, slug, group_no),
      player_b:players!wagers_player_b_id_fkey(id, name, slug, group_no)
    `)
    .order('created_at', { ascending: false });

  const wagers = (wagersRaw ?? []) as unknown as Wager[];
  const active = wagers.filter(w => w.status === 'active');
  const pending = wagers.filter(w => w.status === 'pending');
  const settled = wagers.filter(w => w.status !== 'active' && w.status !== 'pending');

  const totalTokens = active.reduce((s, w) => s + w.stake_tokens, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold gold-bright">Side Wagers</h1>
        <p className="text-sm text-[color:var(--text-dim)] mt-2 uppercase tracking-widest">
          Tokens only · No real money · Bragging rights forever
        </p>
      </div>

      <ProposeWagerForm />

      {/* ============ STATS STRIP ============ */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        <Stat label="Active" value={active.length.toString()} />
        <Stat label="Tokens In Play" value={totalTokens.toString()} />
        <Stat label="Pending" value={pending.length.toString()} />
        <Stat label="Settled" value={settled.length.toString()} />
      </div>

      {/* ============ ACTIVE ============ */}
      <h2 className="text-xl font-bold mb-3">🔥 Active</h2>
      {active.length === 0 ? (
        <div className="rounded-xl border border-line bg-card p-6 text-center text-[color:var(--text-dim)] mb-10">
          No active wagers. Challenge someone in the league chat.
        </div>
      ) : (
        <div className="space-y-3 mb-10">
          {active.map(w => <WagerCard key={w.id} w={w} />)}
        </div>
      )}

      {/* ============ SETTLED ============ */}
      {settled.length > 0 && (
        <>
          <h2 className="text-xl font-bold mb-3">📜 Settled</h2>
          <div className="space-y-3">
            {settled.map(w => <WagerCard key={w.id} w={w} settled />)}
          </div>
        </>
      )}

      <p className="text-[10px] text-[color:var(--text-dim)] text-center mt-10 uppercase tracking-widest">
        Wagers tracked by FrankPicks LLC · Tokens have no cash value
      </p>
    </div>
  );
}

function WagerCard({ w, settled }: { w: Wager; settled?: boolean }) {
  const a = w.player_a;
  const b = w.player_b;
  const winnerIsA = w.winner_player_id && a && w.winner_player_id === a.id;
  const winnerIsB = w.winner_player_id && b && w.winner_player_id === b.id;
  return (
    <div className={`rounded-xl border bg-card p-4 sm:p-5 ${settled ? 'border-line opacity-80' : 'border-[color:var(--gold)]/50'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest text-[color:var(--text-dim)]">
          {w.terms}
        </span>
        <span className={`text-xs font-semibold ${settled ? 'text-[color:var(--text-dim)]' : 'gold-bright'}`}>
          {settled ? w.status.toUpperCase() : '● ACTIVE'}
        </span>
      </div>
      {w.match_label && (
        <div className="text-sm font-semibold gold-bright mb-3 text-center">
          ⚽ {w.match_label}
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <Side player={a} pick={w.pick_a} winner={!!winnerIsA} />
        <div className="text-center px-2 sm:px-4 flex-shrink-0">
          <div className="text-[10px] uppercase tracking-widest text-[color:var(--text-dim)]">Stake</div>
          <div className="text-xl sm:text-2xl font-extrabold gold-bright tabular-nums">
            {w.stake_tokens}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-[color:var(--text-dim)]">Tokens</div>
        </div>
        <Side player={b} pick={w.pick_b} winner={!!winnerIsB} reverse />
      </div>
    </div>
  );
}

function Side({
  player, pick, winner, reverse,
}: {
  player: Wager['player_a'];
  pick: string | null;
  winner: boolean;
  reverse?: boolean;
}) {
  if (!player) return <div className="flex-1" />;
  return (
    <div className={`flex-1 min-w-0 ${reverse ? 'text-right' : 'text-left'}`}>
      <div className={`text-sm sm:text-base font-bold truncate ${winner ? 'gold-bright' : 'text-white'}`}>
        {winner && !reverse && '👑 '}{player.name}{winner && reverse && ' 👑'}
      </div>
      <div className="text-[10px] uppercase tracking-widest text-[color:var(--text-dim)] mt-0.5">
        Group {player.group_no}
      </div>
      {pick && (
        <div className="text-xs gold mt-1 truncate">
          Pick: <span className="font-semibold">{pick}</span>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-card p-3 sm:p-4 text-center">
      <div className="text-2xl sm:text-3xl font-extrabold gold-bright tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-[color:var(--text-dim)] mt-1">{label}</div>
    </div>
  );
}
