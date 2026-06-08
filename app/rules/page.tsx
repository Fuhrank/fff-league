export const metadata = {
  title: 'Rules & Scoring — FFF League',
};

export default function RulesPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-extrabold gold-bright tracking-tight">Rules & Scoring</h1>
        <p className="text-sm text-[color:var(--text-dim)] mt-2 uppercase tracking-widest">
          How Frank's Fantasy Fútbol works
        </p>
      </div>

      {/* ============ THE GAME ============ */}
      <Section title="The Game">
        <p>
          Each owner drafts a small roster of national teams from the FIFA World Cup. As those teams play, owners
          earn points for wins, draws, goals, and how deep their teams advance in the bracket. The owner with the
          most points when the tournament ends wins the league.
        </p>
        <p>
          Each league (group) is fully independent — owners in Group 1 don't compete against owners in Group 2,
          and the same World Cup team can be drafted in multiple leagues. The leaderboard shows each league
          separately.
        </p>
      </Section>

      {/* ============ SCORING ============ */}
      <Section title="Scoring">
        <div className="grid sm:grid-cols-2 gap-4">
          <Card title="Match results">
            <Row label="Win (regulation or ET)" value="+3" />
            <Row label="Draw" value="+1" />
            <Row label="Loss" value="0" />
            <Row label="PK shootout" value="Both owners +1 (draw)" small />
          </Card>

          <Card title="Goals">
            <Row label="Each goal scored by your team" value="+1" />
            <Row label="Own goals" value="excluded" small />
            <Row label="Penalty shootout goals" value="excluded" small />
          </Card>

          <Card title="Bracket advancement">
            <Row label="Survive groups → R32" value="+5" />
            <Row label="Advance to R16" value="+6" />
            <Row label="Advance to QF" value="+7" />
            <Row label="Advance to SF" value="+8" />
            <Row label="Advance to Final" value="+9" />
            <Row label="Win the Cup 🏆" value="+10" />
          </Card>

          <Card title="Wooden spoon (per league)">
            <Row label="Bottom 10 teams" value="+10 each" />
            <Row label="Bottom 2 teams" value="+20 each" />
            <p className="text-xs text-[color:var(--text-dim)] mt-2 leading-relaxed">
              Awarded at the end of the tournament to whoever owns the worst-performing teams in their league.
              Ranked by how few matches the team played. Bottom-2 owners get BOTH bonuses.
            </p>
          </Card>
        </div>
      </Section>

      {/* ============ TIEBREAKER ============ */}
      <Section title="Tiebreaker">
        <p>
          If two owners finish on the same point total, the tiebreaker is{' '}
          <span className="gold-bright font-semibold">total goals scored across their roster</span>. If still tied
          after that, both share the position.
        </p>
      </Section>

      {/* ============ KEY DATES ============ */}
      <Section title="Key dates">
        <ul className="space-y-1.5">
          <li>• <span className="gold-bright font-semibold">June 11, 2026</span> — World Cup kicks off</li>
          <li>• <span className="gold-bright font-semibold">July 19, 2026</span> — Final in New York / New Jersey</li>
          <li>• Leaderboard updates every 15 minutes during match days</li>
        </ul>
      </Section>

      {/* ============ FAQ ============ */}
      <Section title="FAQ">
        <Faq q="What happens if my team wins on penalties?">
          The match counts as a draw for scoring purposes — both owners get +1. The shootout winner still
          advances and earns the next round's advancement bonus. PK shootout goals do NOT count toward goal totals.
        </Faq>
        <Faq q="Do own goals count?">
          No. Own goals are excluded from goal scoring.
        </Faq>
        <Faq q="Can the same World Cup team be drafted by two owners?">
          Only across different leagues. Within a single league (e.g. Group 1), each team has exactly one owner.
          Group 1 and Group 2 are independent — they can both own Brazil.
        </Faq>
        <Faq q="What if a team is disqualified or withdraws?">
          That team scores 0 going forward. It's still eligible for wooden spoon bonuses.
        </Faq>
        <Faq q="How are points updated?">
          Match data is pulled from Football-Data.org and recomputed automatically. During match days the
          leaderboard refreshes every 15 minutes. Between matches it's cached.
        </Faq>
      </Section>

      <p className="mt-12 text-center text-xs text-[color:var(--text-dim)] uppercase tracking-[0.3em]">
        Financial Freedom is one GOAL away
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-2xl font-bold mb-4 gold-bright">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-card p-5">
      <h3 className="font-semibold mb-3 text-[color:var(--text-dim)] uppercase text-xs tracking-widest">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value, small = false }: { label: string; value: string; small?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${small ? 'text-xs text-[color:var(--text-dim)]' : 'text-sm'}`}>
      <span>{label}</span>
      <span className={small ? '' : 'gold-bright font-bold'}>{value}</span>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-card p-4">
      <p className="font-semibold mb-1.5">{q}</p>
      <p className="text-sm text-[color:var(--text-dim)] leading-relaxed">{children}</p>
    </div>
  );
}
