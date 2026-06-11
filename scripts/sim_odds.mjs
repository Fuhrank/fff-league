// Monte Carlo simulator for the 2026 FIFA World Cup (48-team format).
// Run with:
//   set -a && . .env.local && set +a && node scripts/sim_odds.mjs
//   (override sims: SIMS=20000 node scripts/sim_odds.mjs)
//
// Model:
//   - Power = 0.6 * (1/title_odds, normalized) + 0.4 * ((49-fifa_rank)/48, normalized)
//   - Skill on log-odds scale; P(A beats B) via Bradley-Terry logistic
//   - Group stage: P(draw) inversely scales with skill diff (~25% avg)
//   - KO: force a winner with slight noise (penalty randomness)
//   - 12 groups → top 2 + 8 best 3rd-placed → 32-team KO bracket
//   - Reach-round counts → probabilities, percentile-based tier grade

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in env');
  process.exit(1);
}
const supa = createClient(SUPABASE_URL, SUPABASE_KEY);

const KO_PAIRINGS = [
  ['1A', '2C'], ['1B', '2D'], ['1E', '2F'], ['1G', '2H'],
  ['1I', '2J'], ['1K', '2L'], ['1C', '2A'], ['1D', '2B'],
  ['1F', '2E'], ['1H', '2G'], ['1J', '2I'], ['1L', '2K'],
  ['3-1', '3-2'], ['3-3', '3-4'], ['3-5', '3-6'], ['3-7', '3-8'],
];
const GROUPS = 'ABCDEFGHIJKL'.split('');

const rand = Math.random;

function computeSkill(t, norm) {
  const fifaRank = t.fifa_rank ?? 48;
  const odds = t.title_odds ?? 2500;
  const market = 1 / odds;
  const fifa = (49 - fifaRank) / 48;
  const marketNorm = market / norm.maxMkt;
  const fifaNorm = fifa / norm.maxFifa;
  const blended = 0.6 * marketNorm + 0.4 * fifaNorm;
  return -0.25 + 0.5 * blended;
}

function pAwins(skillA, skillB) {
  return 1 / (1 + Math.pow(10, (skillB - skillA) / 0.5));
}

function simulateGroupMatch(a, b) {
  const diff = Math.abs(a.skill - b.skill);
  const pDraw = Math.max(0.10, 0.30 - 0.20 * diff);
  const pA = pAwins(a.skill, b.skill) * (1 - pDraw);
  const r = rand();
  if (r < pDraw) return { aPts: 1, bPts: 1, aGD: 0 };
  if (r < pDraw + pA) {
    const gd = 1 + Math.floor(rand() * 2) + (a.skill - b.skill > 1.0 ? 1 : 0);
    return { aPts: 3, bPts: 0, aGD: gd };
  }
  const gd = 1 + Math.floor(rand() * 2) + (b.skill - a.skill > 1.0 ? 1 : 0);
  return { aPts: 0, bPts: 3, aGD: -gd };
}

function simulateKO(a, b) {
  const p = pAwins(a.skill, b.skill);
  const noisy = p * 0.92 + 0.04;
  return rand() < noisy ? a : b;
}

function simulateGroup(teams) {
  const s = teams.map(t => ({ team: t, pts: 0, gd: 0, tb: rand() }));
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const r = simulateGroupMatch(teams[i], teams[j]);
      s[i].pts += r.aPts; s[i].gd += r.aGD;
      s[j].pts += r.bPts; s[j].gd -= r.aGD;
    }
  }
  s.sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.tb - x.tb);
  return { top2: [s[0].team, s[1].team], third: s[2] };
}

function simulateTournament(teams, counts) {
  const winners = {}, runnersUp = {}, thirds = [];
  for (const g of GROUPS) {
    const groupTeams = teams.filter(t => t.group_letter === g);
    const { top2, third } = simulateGroup(groupTeams);
    winners[g] = top2[0]; runnersUp[g] = top2[1]; thirds.push(third);
  }
  thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.tb - a.tb);
  const top8 = thirds.slice(0, 8).map(s => s.team);

  const resolve = (slot) => {
    if (slot[0] === '1') return winners[slot[1]];
    if (slot[0] === '2') return runnersUp[slot[1]];
    return top8[parseInt(slot.split('-')[1], 10) - 1];
  };

  let round = [];
  for (const [a, b] of KO_PAIRINGS) { round.push(resolve(a)); round.push(resolve(b)); }
  for (const t of round) counts[t.id].r32++;

  let next = [];
  for (let i = 0; i < round.length; i += 2) next.push(simulateKO(round[i], round[i + 1]));
  for (const t of next) counts[t.id].r16++;

  round = next; next = [];
  for (let i = 0; i < round.length; i += 2) next.push(simulateKO(round[i], round[i + 1]));
  for (const t of next) counts[t.id].qf++;

  round = next; next = [];
  for (let i = 0; i < round.length; i += 2) next.push(simulateKO(round[i], round[i + 1]));
  for (const t of next) counts[t.id].sf++;

  round = next; next = [];
  for (let i = 0; i < round.length; i += 2) next.push(simulateKO(round[i], round[i + 1]));
  for (const t of next) counts[t.id].final++;

  const champ = simulateKO(next[0], next[1]);
  counts[champ.id].win++;
}

async function main() {
  const N = Number(process.env.SIMS ?? 10000);
  console.log(`Loading teams …`);
  const { data: rows, error } = await supa
    .from('teams')
    .select('id, name, group_letter, fifa_rank, title_odds');
  if (error) throw error;

  const teamRows = rows.map(r => ({ ...r, title_odds: r.title_odds != null ? Number(r.title_odds) : null }));
  const maxMkt = Math.max(...teamRows.map(r => (r.title_odds ? 1 / r.title_odds : 0)));
  const maxFifa = Math.max(...teamRows.map(r => (49 - (r.fifa_rank ?? 48)) / 48));

  const teams = teamRows.map(r => ({
    id: r.id, name: r.name, group_letter: r.group_letter,
    fifa_rank: r.fifa_rank, title_odds: r.title_odds,
    skill: computeSkill(r, { maxMkt, maxFifa }),
  }));

  if (teams.some(t => !t.group_letter)) {
    throw new Error(`Some teams missing group_letter: ${teams.filter(t => !t.group_letter).map(t => t.id).join(', ')}`);
  }

  const counts = {};
  for (const t of teams) counts[t.id] = { r32: 0, r16: 0, qf: 0, sf: 0, final: 0, win: 0 };

  console.log(`Simulating ${N.toLocaleString()} tournaments …`);
  const t0 = Date.now();
  for (let i = 0; i < N; i++) simulateTournament(teams, counts);
  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s.`);

  const tierOf = {};
  for (const t of teams) {
    const p = counts[t.id].win / N;
    if (p >= 0.10) tierOf[t.id] = 'S';
    else if (p >= 0.04) tierOf[t.id] = 'A';
    else if (p >= 0.015) tierOf[t.id] = 'B';
    else if (p >= 0.003) tierOf[t.id] = 'C';
    else tierOf[t.id] = 'D';
  }

  const expectedPoints = (t) => {
    const c = counts[t.id];
    return 4.5
      + 5 * (c.r16 / N)
      + 5 * (c.qf / N)
      + 5 * (c.sf / N)
      + 5 * (c.final / N)
      + 10 * (c.win / N);
  };

  const out = teams.map(t => ({
    team_id: t.id,
    p_r32: counts[t.id].r32 / N,
    p_r16: counts[t.id].r16 / N,
    p_qf: counts[t.id].qf / N,
    p_sf: counts[t.id].sf / N,
    p_final: counts[t.id].final / N,
    p_win: counts[t.id].win / N,
    power_rating: t.skill,
    tier: tierOf[t.id],
    expected_points: expectedPoints(t),
    sims: N,
    updated_at: new Date().toISOString(),
  }));

  const { error: upErr } = await supa.from('team_odds').upsert(out, { onConflict: 'team_id' });
  if (upErr) throw upErr;

  console.log('\nTop 12 — winner odds:');
  const sorted = [...teams].sort((a, b) => counts[b.id].win - counts[a.id].win);
  for (const t of sorted.slice(0, 12)) {
    const c = counts[t.id];
    console.log(
      `  ${tierOf[t.id]}  ${t.name.padEnd(20)} win=${(c.win/N*100).toFixed(1)}%  final=${(c.final/N*100).toFixed(1)}%  sf=${(c.sf/N*100).toFixed(1)}%  qf=${(c.qf/N*100).toFixed(1)}%`
    );
  }
  console.log('\n✓ team_odds updated.');
}

main().catch(err => { console.error(err); process.exit(1); });
