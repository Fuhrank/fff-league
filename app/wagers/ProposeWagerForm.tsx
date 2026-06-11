'use client';

import { useEffect, useState } from 'react';

type Player = { id: number; name: string; group_no: number };

export default function ProposeWagerForm() {
  const [open, setOpen] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [stake, setStake] = useState('20');
  const [matchLabel, setMatchLabel] = useState('');
  const [pickA, setPickA] = useState('');
  const [pickB, setPickB] = useState('');
  const [terms, setTerms] = useState('Pick the team that will win the match');
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || players.length) return;
    fetch('/api/wagers/propose').then(r => r.json()).then(j => setPlayers(j.players ?? []));
  }, [open, players.length]);

  async function submit() {
    setSubmitting(true);
    setStatus(null);
    const res = await fetch('/api/wagers/propose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player_a_id: Number(a), player_b_id: Number(b),
        stake_tokens: Number(stake),
        match_label: matchLabel, pick_a: pickA, pick_b: pickB,
        terms,
      }),
    });
    const j = await res.json();
    setSubmitting(false);
    if (res.ok) {
      setStatus(`✓ ${j.message}`);
      setA(''); setB(''); setStake('20'); setMatchLabel(''); setPickA(''); setPickB('');
    } else {
      setStatus(`✗ ${j.error}`);
    }
  }

  if (!open) {
    return (
      <div className="mb-8 text-center">
        <button
          onClick={() => setOpen(true)}
          className="px-5 py-2.5 rounded-lg bg-[color:var(--gold)] text-black font-bold uppercase tracking-widest text-xs hover:opacity-90"
        >
          + Propose a Wager
        </button>
        <p className="text-[10px] text-[color:var(--text-dim)] mt-2 uppercase tracking-widest">
          Subject to admin approval
        </p>
      </div>
    );
  }

  const aPlayer = players.find(p => p.id === Number(a));
  const bPlayer = players.find(p => p.id === Number(b));

  return (
    <div className="mb-8 rounded-xl border-2 border-[color:var(--gold)]/60 bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold gold-bright">Propose a Wager</h2>
        <button onClick={() => setOpen(false)} className="text-xs text-[color:var(--text-dim)] hover:text-white">✕ Cancel</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-[color:var(--text-dim)]">Your name</label>
          <select value={a} onChange={e => setA(e.target.value)} className="w-full mt-1 px-3 py-2 rounded bg-elev border border-line">
            <option value="">Select yourself…</option>
            {players.map(p => <option key={p.id} value={p.id}>{p.name} (G{p.group_no})</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-[color:var(--text-dim)]">Opponent</label>
          <select value={b} onChange={e => setB(e.target.value)} className="w-full mt-1 px-3 py-2 rounded bg-elev border border-line">
            <option value="">Select opponent…</option>
            {players.filter(p => String(p.id) !== a).map(p => (
              <option key={p.id} value={p.id}>{p.name} (G{p.group_no})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-[color:var(--text-dim)]">Stake (tokens)</label>
          <input
            type="number" min={1} max={10000} value={stake} onChange={e => setStake(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded bg-elev border border-line"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-[color:var(--text-dim)]">Match (optional)</label>
          <input
            value={matchLabel} onChange={e => setMatchLabel(e.target.value)}
            placeholder="e.g. Brazil vs Morocco · June 18"
            className="w-full mt-1 px-3 py-2 rounded bg-elev border border-line"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-[color:var(--text-dim)]">
            {aPlayer?.name || 'Your'} pick
          </label>
          <input
            value={pickA} onChange={e => setPickA(e.target.value)}
            placeholder="e.g. Brazil 🇧🇷"
            className="w-full mt-1 px-3 py-2 rounded bg-elev border border-line"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-[color:var(--text-dim)]">
            {bPlayer?.name || 'Opponent'} pick
          </label>
          <input
            value={pickB} onChange={e => setPickB(e.target.value)}
            placeholder="e.g. Morocco 🇲🇦"
            className="w-full mt-1 px-3 py-2 rounded bg-elev border border-line"
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="text-[10px] uppercase tracking-widest text-[color:var(--text-dim)]">Terms</label>
        <input
          value={terms} onChange={e => setTerms(e.target.value)}
          className="w-full mt-1 px-3 py-2 rounded bg-elev border border-line"
        />
      </div>

      <button
        onClick={submit}
        disabled={submitting || !a || !b || !stake}
        className="w-full px-4 py-2.5 rounded-lg bg-[color:var(--gold)] text-black font-bold disabled:opacity-40"
      >
        {submitting ? 'Submitting…' : 'Submit for Approval'}
      </button>

      {status && (
        <p className={`text-xs mt-3 ${status.startsWith('✓') ? 'gold-bright' : 'text-red-400'}`}>
          {status}
        </p>
      )}
      <p className="text-[10px] text-[color:var(--text-dim)] mt-3 uppercase tracking-widest text-center">
        Pending wagers appear here once approved by admin
      </p>
    </div>
  );
}
