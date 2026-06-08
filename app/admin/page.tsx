'use client';

import { useEffect, useState } from 'react';

type Team = { id: string; name: string; flag_emoji: string | null };
type Player = { id: number; name: string; slug: string; group_no: number };

export default function AdminPage() {
  const [pw, setPw] = useState('');
  const [authed, setAuthed] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [status, setStatus] = useState<string>('');

  const [newPlayer, setNewPlayer] = useState('');
  const [newPlayerGroup, setNewPlayerGroup] = useState<1 | 2>(1);
  const [pickPlayer, setPickPlayer] = useState('');
  const [pickTeams, setPickTeams] = useState<string[]>(['', '', '', '']);

  async function api(action: string, body: any = {}) {
    setStatus('…');
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-pw': pw },
      body: JSON.stringify({ action, ...body }),
    });
    const j = await res.json();
    setStatus(res.ok ? `✓ ${j.message ?? 'done'}` : `✗ ${j.error ?? 'error'}`);
    return j;
  }

  async function refresh() {
    const j = await api('list');
    if (j?.teams) setTeams(j.teams);
    if (j?.players) setPlayers(j.players);
  }

  async function login() {
    const j = await api('list');
    if (j?.teams) {
      setAuthed(true);
      setTeams(j.teams);
      setPlayers(j.players);
    }
  }

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto">
        <h1 className="text-2xl font-bold mb-4">Admin</h1>
        <input
          type="password" placeholder="Password" value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          className="w-full px-3 py-2 rounded bg-card border border-line"
        />
        <button onClick={login} className="mt-3 px-4 py-2 rounded bg-[color:var(--gold)] text-black font-semibold w-full">
          Enter
        </button>
        {status && <p className="text-xs mt-3 text-[color:var(--text-dim)]">{status}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-bold">Admin</h1>

      <section className="rounded-xl border border-line bg-card p-5">
        <h2 className="font-semibold mb-3">Add owner</h2>
        <div className="flex gap-2">
          <input
            value={newPlayer} onChange={e => setNewPlayer(e.target.value)}
            placeholder="Owner name" className="flex-1 px-3 py-2 rounded bg-elev border border-line"
          />
          <select
            value={newPlayerGroup}
            onChange={e => setNewPlayerGroup(Number(e.target.value) as 1 | 2)}
            className="px-3 py-2 rounded bg-elev border border-line"
          >
            <option value={1}>Group 1</option>
            <option value={2}>Group 2</option>
          </select>
          <button
            onClick={async () => { if (newPlayer) { await api('add_player', { name: newPlayer, group_no: newPlayerGroup }); setNewPlayer(''); refresh(); } }}
            className="px-4 py-2 rounded bg-[color:var(--gold)] text-black font-semibold"
          >Add</button>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {[1, 2].map(g => (
            <div key={g}>
              <p className="gold-bright font-semibold mb-1">Group {g} ({players.filter(p => p.group_no === g).length})</p>
              <ul className="space-y-1">
                {players.filter(p => p.group_no === g).map(p => (
                  <li key={p.id} className="text-[color:var(--text-dim)] flex items-center justify-between">
                    <span>• {p.name}</span>
                    <button
                      onClick={async () => { await api('set_player_group', { player_id: p.id, group_no: g === 1 ? 2 : 1 }); refresh(); }}
                      className="text-xs px-2 py-0.5 rounded border border-line hover:gold-bright"
                    >→ G{g === 1 ? 2 : 1}</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-card p-5">
        <h2 className="font-semibold mb-3">Record draft pick (owner → 4 teams)</h2>
        <select value={pickPlayer} onChange={e => setPickPlayer(e.target.value)} className="w-full px-3 py-2 rounded bg-elev border border-line mb-3">
          <option value="">Select owner…</option>
          {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {pickTeams.map((t, i) => (
            <select key={i} value={t} onChange={e => {
              const c = [...pickTeams]; c[i] = e.target.value; setPickTeams(c);
            }} className="px-3 py-2 rounded bg-elev border border-line">
              <option value="">Team {i + 1}…</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.flag_emoji} {team.name}</option>
              ))}
            </select>
          ))}
        </div>
        <button
          onClick={async () => {
            if (pickPlayer && pickTeams.every(Boolean)) {
              await api('set_picks', { player_id: Number(pickPlayer), team_ids: pickTeams });
              setPickPlayer(''); setPickTeams(['', '', '', '']);
            }
          }}
          className="px-4 py-2 rounded bg-[color:var(--gold)] text-black font-semibold"
        >Save picks</button>
      </section>

      <section className="rounded-xl border border-line bg-card p-5">
        <h2 className="font-semibold mb-3">Sync & recompute</h2>
        <div className="flex gap-2">
          <button onClick={() => api('sync')} className="px-4 py-2 rounded bg-elev border border-line">Pull from Football-Data</button>
          <button onClick={() => api('recompute')} className="px-4 py-2 rounded bg-elev border border-line">Recompute scoring</button>
        </div>
      </section>

      {status && <p className="text-xs text-[color:var(--text-dim)]">{status}</p>}
    </div>
  );
}
