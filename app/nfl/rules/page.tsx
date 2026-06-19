import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function NflRulesPage() {
  return (
    <div className="max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        href="/"
        className="text-xs uppercase tracking-widest text-[color:var(--text-dim)] hover:text-white"
      >
        ← Home
      </Link>

      {/* ============ COMING SOON HERO ============ */}
      <div className="mt-4 rounded-2xl border border-[color:var(--gold)] bg-card p-6 sm:p-8 text-center shadow-2xl">
        <div className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-[color:var(--text-dim)] mb-2">
          🏈 NFL · Fantasy Owner&apos;s League
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold gold-bright tracking-tight leading-none">
          Coming Soon
        </h1>
        <div className="mx-auto h-px w-24 bg-[color:var(--gold)] opacity-60 my-4" />
        <p className="text-sm sm:text-base text-white">
          Drops <span className="font-bold gold-bright">September 2026</span>
        </p>
        <p className="text-xs text-[color:var(--text-dim)] mt-2 uppercase tracking-widest">
          Full ruleset below
        </p>
      </div>

      {/* ============ FORMAT ============ */}
      <Section title="1 · Format">
        <ul className="space-y-2 text-sm text-white">
          <Bullet><strong>32 NFL teams</strong> available in the draft pool</Bullet>
          <Bullet><strong>2 – 16 players</strong> per league</Bullet>
          <Bullet>Players can opt in to a <strong>randomized draft order</strong></Bullet>
          <Bullet><strong>Snake draft</strong> or commissioner&apos;s preferred order</Bullet>
          <Bullet>
            <strong>Leftover teams</strong> (when players × teams-per-player &lt; 32) are
            unowned at draft and <em>do not earn points for anyone</em> until purchased mid-season.
          </Bullet>
        </ul>
      </Section>

      {/* ============ SCORING ============ */}
      <Section title="2 · How to Earn Points">
        <div className="rounded-lg border border-line bg-elev overflow-hidden">
          <ScoreRow label="Win" value="+7" />
          <ScoreRow label="Tie" value="+2 each team" />
          <ScoreRow label="Touchdown (all TDs: offense, defense, special teams)" value="+2" />
          <ScoreRow label="Extra point" value="+0.5" />
          <ScoreRow label="2-point conversion" value="+1" />
          <ScoreRow label="Field goal" value="+1" />
          <ScoreRow label="Safety" value="+1" />
          <ScoreRow label="Division winner" value="+10" />
          <ScoreRow label="Each playoff win" value="+3" />
          <ScoreRow label="Super Bowl appearance (both teams)" value="+8" />
          <ScoreRow label="Super Bowl winner" value="+10" last />
        </div>
        <p className="text-xs text-[color:var(--text-dim)] mt-3">
          Playoff bonuses stack on top of the +3-per-win. Reaching the Super Bowl is
          worth <strong>+11</strong> for that round, and winning it is worth <strong>+13</strong>.
        </p>
      </Section>

      {/* ============ MID-SEASON TEAM MARKET ============ */}
      <Section title="3 · Mid-Season Team Market">
        <ul className="space-y-2 text-sm text-white">
          <Bullet>
            Unowned (leftover) teams are <strong>available for purchase mid-season</strong>
          </Bullet>
          <Bullet>
            <strong>Cost = the team&apos;s accumulated points to date × 1.0</strong>
            <span className="block text-xs text-[color:var(--text-dim)] mt-1">
              You pay exactly what the team has earned so far. A hot team costs more,
              a cold team costs less. Naturally scales with both record and TDs.
            </span>
          </Bullet>
          <Bullet>You must have the points in your balance to buy — no debt</Bullet>
          <Bullet>
            Points spent are deducted from your total. The team&apos;s future points
            (and any retroactive points back to purchase) belong to you.
          </Bullet>
        </ul>
      </Section>

      {/* ============ TRADES ============ */}
      <Section title="4 · Trades">
        <ul className="space-y-2 text-sm text-white">
          <Bullet>Players can trade teams with each other at any time</Bullet>
          <Bullet>Trades can include points as part of the package</Bullet>
          <Bullet>
            <strong>Approval flow:</strong>
            <ol className="list-decimal ml-5 mt-1 space-y-1 text-xs text-[color:var(--text-dim)]">
              <li>League vote: <strong>more than half</strong> of players must vote YES within 24 hours</li>
              <li>If 24 hours pass without majority, the <strong>commissioner can decline</strong></li>
              <li>If 48 hours pass with no decline, the trade <strong>goes through automatically</strong></li>
            </ol>
          </Bullet>
        </ul>
      </Section>

      {/* ============ WAGERS ============ */}
      <Section title="5 · In-Tournament Wagers">
        <ul className="space-y-2 text-sm text-white">
          <Bullet>
            Players can wager their <strong>current points</strong> against another player
          </Bullet>
          <Bullet>
            Both players must have a team playing in the same game that week
            (wagers are tied to a real NFL matchup between your teams)
          </Bullet>
          <Bullet>
            Wager the outcome of the game — <strong>moneyline (ML)</strong> or
            <strong> spread</strong>
          </Bullet>
          <Bullet>
            <strong>Max wager:</strong> lesser of <strong>25% of your current points</strong>
            <em> or </em><strong>10 points</strong>
          </Bullet>
          <Bullet>
            <strong>Approval:</strong> majority vote of all players within 24 hours,
            or commissioner approval
          </Bullet>
          <Bullet>
            Winner takes the wagered points from the loser&apos;s balance.
            Loser&apos;s balance is debited that amount.
          </Bullet>
        </ul>
      </Section>

      <div className="my-12 text-center text-xs text-[color:var(--text-dim)] uppercase tracking-widest">
        Rules subject to commissioner refinement before launch
      </div>
    </div>
  );
}

/* ===== Reusable bits ===== */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl sm:text-2xl font-extrabold gold-bright tracking-tight mb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="gold-bright">▸</span>
      <span>{children}</span>
    </li>
  );
}

function ScoreRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-4 py-2.5 ${!last ? 'border-b border-line' : ''}`}>
      <span className="text-sm text-white">{label}</span>
      <span className="text-sm font-bold gold-bright whitespace-nowrap ml-3">{value}</span>
    </div>
  );
}
