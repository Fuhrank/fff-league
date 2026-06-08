'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

type Player = { id: number; name: string; slug: string; group_no: number };
type Team = { id: string; name: string; flag_emoji: string | null };
type Pick = { player_id: number; team_id: string; pick_order: number };

type State = {
  group: number;
  players: Player[];
  teams: Team[];
  picks: Pick[];
  order: number[] | null;
  rounds: number;
  status: 'pending' | 'drafting' | 'complete';
  onTheClock: number | null;
  pickNumber: number;
};

export default function DraftPage({ params }: { params: Promise<{ group: string }> }) {
  const { group } = use(params);
  const g = Number(group);

  const [state, setState] = useState<State | null>(null);
  const [pw, setPw] = useState('');
  const [status, setStatus] = useState('');
  const [rounds, setRounds] = useState(4);

  // Random-name picker animation state
  const [spinning, setSpinning] = useState(false);
  const [spinName, setSpinName] = useState<string>('');
  const [revealed, setRevealed] = useState<Player[]>([]);
  const [pool, setPool] = useState<Player[]>([]);

  async function refresh() {
    const res = await fetch(`/api/draft?group=${g}`, { cache: 'no-store' });
    const j: State = await res.json();
    setState(j);
    if (j.rounds) setRounds(j.rounds);
    return j;
  }

  useEffect(() => { refresh(); }, []);
  // Soft poll so spectators see picks land
  useEffect(() => {
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, []);

  async function api(action: string, body: any = {}) {
    setStatus('…');
    const res = await fetch('/api/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-pw': pw },
      body: JSON.stringify({ action, group: g, ...body }),
    });
    const j = await res.json();
    setStatus(res.ok ? `✓ ${j.message ?? 'done'}` : `✗ ${j.error ?? 'error'}`);
    await refresh();
    return j;
  }

  if (!state) {
    return <div className="text-[color:var(--text-dim)]">Loading draft room…</div>;
  }

  const pickedSet = new Set(state.picks.map(p => p.team_id));
  const byPlayer = new Map<number, Pick[]>();
  for (const p of state.picks) {
    const arr = byPlayer.get(p.player_id) ?? [];
    arr.push(p);
    byPlayer.set(p.player_id, arr);
  }
  const playerById = new Map(state.players.map(p => [p.id, p]));
  const totalPicks = (state.order?.length ?? 0) * (state.rounds ?? 4);

  // ===================== ANIMATIONS: random name picker =====================
  function startRandomOrder() {
    setRevealed([]);
    setPool([...state!.players]);
  }
  function pickNextName() {
    if (pool.length === 0) return;
    setSpinning(true);
    const start = Date.now();
    const DURATION = 1800;
    const tick = () => {
      const elapsed = Date.now() - start;
      const random = pool[Math.floor(Math.random() * pool.length)];
      setSpinName(random.name);
      if (elapsed < DURATION) {
        const delay = 50 + (elapsed / DURATION) * 220; // slow down
        setTimeout(tick, delay);
      } else {
        const winnerIdx = Math.floor(Math.random() * pool.length);
        const winner = pool[winnerIdx];
        setSpinName(winner.name);
        setRevealed(r => [...r, winner]);
        setPool(p => p.filter((_, i) => i !== winnerIdx));
        setSpinning(false);
      }
    };
    tick();
  }
  async function saveOrder() {
    if (revealed.length === 0) return;
    if (revealed.length < state!.players.length) {
      if (!confirm(`Only ${revealed.length} of ${state!.players.length} owners drawn. Save anyway?`)) return;
    }
    await api('set_order', { order: revealed.map(p => p.id), rounds });
    setRevealed([]); setPool([]); setSpinName('');
  }

  // ===================== UI =====================
  const isPending = state.status === 'pending' || !state.order;
  const isDrafting = state.status === 'drafting';
  const isComplete = state.status === 'complete';

  return (
    <div>
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <Link href="/leaderboard" className="text-sm text-[color:var(--text-dim)] hover:gold-bright">← Leaderboard</Link>
          <h1 className="text-3xl sm:text-4xl font-bold mt-2">Draft Room — Group {g}</h1>
          <p className="text-sm text-[color:var(--text-dim)] mt-1">
            {state.players.length} owners · {rounds} rounds · snake order
          </p>
        </div>
        <div className="text-right">
          <StatusBadge status={state.status} />
          {isDrafting && (
            <div className="text-xs text-[color:var(--text-dim)] mt-2">
              Pick {state.pickNumber} of {totalPicks}
            </div>
          )}
        </div>
      </div>

      {/* ============ ADMIN PASSWORD ============ */}
      <details className="mb-6 rounded-xl border border-line bg-card p-4">
        <summary className="cursor-pointer text-sm gold-bright font-semibold">
          🔒 Admin (required to make picks)
        </summary>
        <div className="mt-3 flex gap-2">
          <input
            type="password" value={pw} onChange={e => setPw(e.target.value)}
            placeholder="Admin password"
            className="flex-1 px-3 py-2 rounded bg-elev border border-line text-sm"
          />
        </div>
        {status && <p className="text-xs mt-2 text-[color:var(--text-dim)]">{status}</p>}
      </details>

      {/* ============ PENDING: random order picker ============ */}
      {isPending && (
        <section className="rounded-xl border border-line bg-card p-5 mb-8">
          <h2 className="text-xl font-bold gold-bright mb-2">Step 1 — Set the draft order</h2>
          <p className="text-sm text-[color:var(--text-dim)] mb-4">
            Click "Draw next" to randomly pull an owner. Keep going until all {state.players.length} are pulled,
            then save the order to start the draft.
          </p>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <label className="text-xs text-[color:var(--text-dim)] uppercase tracking-widest">Rounds:</label>
            <input
              type="number" min={1} max={10} value={rounds}
              onChange={e => setRounds(Math.max(1, Number(e.target.value)))}
              className="w-20 px-2 py-1 rounded bg-elev border border-line text-sm"
            />
            {pool.length === 0 && revealed.length === 0 && (
              <button onClick={startRandomOrder}
                className="px-4 py-2 rounded bg-elev border border-line text-sm hover:gold-bright">
                Load owners into the hat
              </button>
            )}
            {pool.length > 0 && (
              <button onClick={pickNextName} disabled={spinning}
                className="px-5 py-2 rounded bg-[color:var(--gold)] text-black font-semibold disabled:opacity-50">
                {spinning ? 'Drawing…' : `🎲 Draw next (${pool.length} left)`}
              </button>
            )}
            {revealed.length > 0 && pool.length === 0 && (
              <button onClick={saveOrder}
                className="px-5 py-2 rounded bg-[color:var(--gold)] text-black font-semibold">
                ✓ Save order & start draft
              </button>
            )}
            {revealed.length > 0 && (
              <button onClick={() => { setRevealed([]); setPool([...state!.players]); setSpinName(''); }}
                className="px-3 py-2 rounded border border-line text-xs text-[color:var(--text-dim)]">
                Reset
              </button>
            )}
          </div>

          {/* The spinning name */}
          {(spinning || spinName) && (
            <div className="my-6 text-center">
              <div className="text-xs uppercase tracking-widest text-[color:var(--text-dim)] mb-2">
                {spinning ? 'Drawing…' : 'Next pick:'}
              </div>
              <div className={`text-5xl sm:text-6xl font-black gold-bright transition-transform ${spinning ? 'animate-pulse' : ''}`}>
                {spinName || '—'}
              </div>
            </div>
          )}

          {/* Revealed order so far */}
          {revealed.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-widest text-[color:var(--text-dim)] mb-2">
                Order so far ({revealed.length}/{state.players.length})
              </div>
              <ol className="space-y-1.5">
                {revealed.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-3 px-3 py-2 rounded bg-elev border border-line">
                    <span className="gold-bright font-bold w-6">{i + 1}.</span>
                    <span className="font-semibold">{p.name}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      )}

      {/* ============ DRAFTING / COMPLETE board ============ */}
      {!isPending && state.order && (
        <>
          {/* ON THE CLOCK */}
          {isDrafting && state.onTheClock && (
            <section className="rounded-2xl border border-[color:var(--gold)] bg-[color:var(--gold)]/5 p-5 mb-6 text-center">
              <div className="text-xs uppercase tracking-widest text-[color:var(--text-dim)]">On the clock</div>
              <div className="text-3xl sm:text-4xl font-black gold-bright mt-1">
                {playerById.get(state.onTheClock)?.name ?? '—'}
              </div>
              <div className="text-xs text-[color:var(--text-dim)] mt-2">
                Pick #{state.pickNumber} · Round {Math.floor((state.pickNumber - 1) / state.order.length) + 1} of {state.rounds}
              </div>
            </section>
          )}
          {isComplete && (
            <section className="rounded-2xl border border-[color:var(--gold)] bg-[color:var(--gold)]/10 p-5 mb-6 text-center">
              <div className="text-2xl font-bold gold-bright">🏆 Draft complete</div>
              <div className="text-sm text-[color:var(--text-dim)] mt-1">
                All {totalPicks} picks recorded.
              </div>
            </section>
          )}

          {/* AVAILABLE TEAMS */}
          {isDrafting && (
            <section className="mb-8">
              <h2 className="text-lg font-bold gold-bright mb-3">
                Available teams ({state.teams.length - pickedSet.size} left)
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {state.teams.map(team => {
                  const taken = pickedSet.has(team.id);
                  return (
                    <button
                      key={team.id}
                      disabled={taken || !state.onTheClock}
                      onClick={async () => {
                        if (!pw) { setStatus('✗ enter admin password first'); return; }
                        if (!confirm(`Assign ${team.flag_emoji} ${team.name} to ${playerById.get(state.onTheClock!)?.name}?`)) return;
                        await api('make_pick', { player_id: state.onTheClock, team_id: team.id });
                      }}
                      className={`px-3 py-3 rounded-lg border text-left transition-all ${
                        taken
                          ? 'border-line bg-elev/50 opacity-40 line-through cursor-not-allowed'
                          : 'border-line bg-card hover:border-[color:var(--gold)] hover:bg-elev cursor-pointer'
                      }`}
                    >
                      <div className="text-2xl mb-1">{team.flag_emoji}</div>
                      <div className="text-xs font-medium leading-tight">{team.name}</div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* SNAKE BOARD */}
          <section className="mb-8">
            <h2 className="text-lg font-bold gold-bright mb-3">Snake board</h2>
            <div className="overflow-x-auto rounded-xl border border-line bg-card">
              <table className="w-full text-sm">
                <thead className="bg-elev text-[color:var(--text-dim)] uppercase text-[10px] tracking-widest">
                  <tr>
                    <th className="text-left px-3 py-2 sticky left-0 bg-elev">Owner</th>
                    {Array.from({ length: state.rounds }).map((_, r) => (
                      <th key={r} className="text-left px-3 py-2 min-w-[120px]">R{r + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {state.order.map((pid, ownerIdx) => {
                    const player = playerById.get(pid);
                    const picks = byPlayer.get(pid) ?? [];
                    return (
                      <tr key={pid} className={`border-t border-line ${state.onTheClock === pid ? 'bg-[color:var(--gold)]/10' : ''}`}>
                        <td className="px-3 py-2 sticky left-0 bg-card font-semibold whitespace-nowrap">
                          <span className="gold opacity-70 mr-1.5 text-xs">{ownerIdx + 1}.</span>
                          {player?.name ?? `#${pid}`}
                        </td>
                        {Array.from({ length: state.rounds }).map((_, r) => {
                          // Which pick number would land in this cell?
                          const orderLen = state.order!.length;
                          const posInRound = r % 2 === 0 ? ownerIdx : orderLen - 1 - ownerIdx;
                          const pickIdx = r * orderLen + posInRound; // 0-indexed pick #
                          const isCurrent = isDrafting && pickIdx === state.pickNumber - 1;
                          // What team was picked here? Need to map: the (r+1)-th pick this player made.
                          // Picks are in DB ordered by id (insert time); pick_order = 1..rounds for that player.
                          const teamForRound = picks.find(p => p.pick_order === r + 1);
                          const team = teamForRound ? state.teams.find(t => t.id === teamForRound.team_id) : null;
                          return (
                            <td key={r} className={`px-3 py-2 ${isCurrent ? 'ring-2 ring-[color:var(--gold)] ring-inset' : ''}`}>
                              {team ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <span>{team.flag_emoji}</span>
                                  <span className="text-xs">{team.name}</span>
                                </span>
                              ) : (
                                <span className="text-[color:var(--text-dim)]/40 text-xs">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* ADMIN CONTROLS */}
          {pw && (
            <section className="rounded-xl border border-line bg-card p-4 mb-6">
              <h3 className="text-sm gold-bright font-semibold mb-2">Admin controls</h3>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => api('undo_last')}
                  className="px-3 py-1.5 rounded bg-elev border border-line text-xs hover:gold-bright">
                  Undo last pick
                </button>
                <button onClick={() => { if (confirm(`WIPE all picks for Group ${g}? This cannot be undone.`)) api('reset'); }}
                  className="px-3 py-1.5 rounded bg-elev border border-line text-xs text-red-400 hover:text-red-300">
                  Reset draft
                </button>
              </div>
              {status && <p className="text-xs mt-2 text-[color:var(--text-dim)]">{status}</p>}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Not started', cls: 'bg-elev border-line text-[color:var(--text-dim)]' },
    drafting: { label: 'Drafting LIVE', cls: 'bg-[color:var(--gold)]/15 border-[color:var(--gold)] gold-bright' },
    complete: { label: 'Complete', cls: 'bg-elev border-line text-[color:var(--text-dim)]' },
  };
  const cfg = map[status] ?? map.pending;
  return (
    <span className={`inline-block px-3 py-1 rounded-full border text-xs uppercase tracking-widest font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
