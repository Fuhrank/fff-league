'use client';

import { useEffect, useState } from 'react';

type Player = { id: number; name: string; group_no: number };

export default function AcceptOpenWager({ wagerId, proposerId }: { wagerId: string; proposerId: number }) {
  const [showing, setShowing] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [pid, setPid] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!showing || players.length) return;
    fetch('/api/wagers/propose')
      .then(r => r.json())
      .then(j => setPlayers((j.players ?? []).filter((p: Player) => p.id !== proposerId)));
  }, [showing, players.length, proposerId]);

  async function accept() {
    setSubmitting(true);
    setStatus(null);
    const res = await fetch('/api/wagers/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wager_id: wagerId, player_b_id: Number(pid) }),
    });
    const j = await res.json();
    setSubmitting(false);
    if (res.ok) {
      setStatus(`✓ ${j.message}`);
      // Trigger a refresh after a beat so the page revalidates.
      setTimeout(() => window.location.reload(), 1200);
    } else {
      setStatus(`✗ ${j.error}`);
    }
  }

  if (!showing) {
    return (
      <button
        onClick={() => setShowing(true)}
        className="mt-3 w-full px-4 py-2 rounded-lg bg-[color:var(--gold)] text-black font-bold uppercase tracking-widest text-xs hover:opacity-90"
      >
        ✋ Accept Challenge
      </button>
    );
  }

  return (
    <div className="mt-3 p-3 rounded-lg border border-[color:var(--gold)]/40 bg-elev">
      <label className="text-[10px] uppercase tracking-widest text-[color:var(--text-dim)]">
        Pick your name to accept
      </label>
      <select
        value={pid}
        onChange={e => setPid(e.target.value)}
        className="w-full mt-1 px-3 py-2 rounded bg-card border border-line"
      >
        <option value="">Select your name…</option>
        {players.map(p => <option key={p.id} value={p.id}>{p.name} (G{p.group_no})</option>)}
      </select>
      <div className="flex gap-2 mt-3">
        <button
          onClick={accept}
          disabled={submitting || !pid}
          className="flex-1 px-3 py-2 rounded-lg bg-[color:var(--gold)] text-black font-bold uppercase tracking-widest text-xs disabled:opacity-40"
        >
          {submitting ? 'Sending…' : 'Accept & Send for Approval'}
        </button>
        <button
          onClick={() => setShowing(false)}
          className="px-3 py-2 rounded-lg border border-line text-xs uppercase tracking-widest text-[color:var(--text-dim)] hover:text-white"
        >
          Cancel
        </button>
      </div>
      {status && (
        <p className={`text-xs mt-2 ${status.startsWith('✓') ? 'gold-bright' : 'text-red-400'}`}>
          {status}
        </p>
      )}
    </div>
  );
}
