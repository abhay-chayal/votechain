import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Button } from '../../components/ui'
import { useApi } from '../../lib/useApi'
import { electionStatus, fmtNum } from '../../lib/utils'

const steps = [
  ['Set up the ballot', 'Add the positions, candidates and their manifestos, and choose when polls open and close.'],
  ['Upload the voter list', 'Paste emails or upload a CSV. Each member gets a private invite, and only they can vote.'],
  ['Members vote', 'Voters sign in with a one-time email code and choose once. Each ballot is written to the blockchain within seconds.'],
  ['Everyone can check the count', 'When polls close, the totals are read straight from the contract. Anyone with the link can verify them.'],
]

const rules = [
  ['One vote per member', 'A second ballot from the same voter is rejected, even if it comes from our own servers.', 'AlreadyVoted'],
  ['Only people on the list', 'Eligibility is checked against a fingerprint of the voter list that is fixed when polls open.', 'InvalidMerkleProof'],
  ['Only while polls are open', 'Ballots before the opening time or after closing are refused.', 'ElectionNotActive'],
  ['Totals stay sealed', 'Nobody, including the organizer, can read results before voting closes.', 'ElectionStillRunning'],
  ['No quiet edits', 'A hash of the ballot is stored on-chain. The public results page re-checks it on every visit.', 'detailsHash'],
]

const uses = [
  ['Colleges', 'Student council, department representatives, club office-bearers'],
  ['Housing societies', 'RWA committees, with one vote per flat'],
  ['Companies', 'Board resolutions and employee polls'],
  ['NGOs and trusts', 'Governing committee elections'],
  ['Clubs and associations', 'Annual office-bearer elections'],
]

function ReceiptSlip() {
  const rows = [
    ['Election', 'Student Council President 2026–27'],
    ['Cast', '25 Sep 2026 · 10:42'],
    ['Block', '#6,899,997'],
    ['Transaction', '0x7d1c9e2a…9e8d7c6b'],
    ['Voter', 'anonymous token 0x5616…aded'],
    ['Choice', 'not recorded on this slip'],
  ]
  return (
    <figure className="mx-auto w-full max-w-[380px]">
      <div className="relative rotate-[0.8deg] border border-line bg-surface px-6 pb-8 pt-6 font-mono text-[12.5px] shadow-[0_24px_48px_-28px_rgba(27,26,23,0.45)]">
        <div className="flex items-baseline justify-between text-muted">
          <span className="tracking-[0.18em]">VOTE RECEIPT</span>
          <span>No. VC-8F3A-21C9</span>
        </div>
        <div className="my-4 border-t border-dashed border-line-strong" />
        <dl className="space-y-2.5">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[92px_1fr] gap-3">
              <dt className="text-muted">{k}</dt>
              <dd className="text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="my-4 border-t border-dashed border-line-strong" />
        <div className="flex items-center justify-between gap-4">
          <p className="text-muted">Verify at<br />votechain.app/receipt</p>
          <span className="animate-stamp shrink-0 rounded-[3px] border-2 border-stamp px-2.5 py-1 text-[13px] font-medium uppercase tracking-[0.2em] text-stamp">
            Recorded
          </span>
        </div>
        <div className="perforated absolute inset-x-0 -bottom-px h-2.5 rotate-180" />
      </div>
      <figcaption className="mt-6 text-center text-sm text-muted">
        Every voter gets a slip like this. It proves the vote was counted, not who it was for.
      </figcaption>
    </figure>
  )
}

function Stats() {
  const { data } = useApi('/public/elections')
  const list = data?.elections || []
  const stats = [
    [data ? fmtNum(list.reduce((a, e) => a + e.votesCast, 0)) : '—', 'votes recorded on-chain'],
    [data ? fmtNum(list.length) : '—', 'public elections'],
    [data ? fmtNum(list.filter((e) => electionStatus(e) === 'live').length) : '—', 'open for voting right now'],
  ]
  return (
    <section className="border-y border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-px bg-line sm:grid-cols-[1fr_1fr_1fr_auto]">
        {stats.map(([n, label]) => (
          <div key={label} className="bg-surface px-4 py-6 sm:px-6">
            <div className="font-display text-[34px] font-semibold leading-none tabular-nums">{n}</div>
            <div className="mt-2 text-sm text-muted">{label}</div>
          </div>
        ))}
        <Link to="/verify" className="group flex items-center gap-2 bg-surface px-4 py-6 text-sm font-medium text-primary sm:px-6">
          Browse public results <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  )
}

export default function Landing() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-16 sm:py-24 lg:grid-cols-[1.15fr_1fr]">
        <div className="animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Online elections, recorded on Ethereum</p>
          <h1 className="mt-5 font-display text-[44px] font-semibold leading-[1.02] tracking-[-0.02em] sm:text-[64px]">
            Every vote,<br />on the record.
          </h1>
          <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-muted">
            VoteChain runs elections for colleges, housing societies, companies and clubs. Each ballot is written to a public blockchain the moment it's cast, so anyone can check the count, including the people who lost.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Button size="lg" to="/register">Run an election</Button>
            <Link to="/login" className="text-[15px] font-medium underline decoration-line-strong underline-offset-4 hover:decoration-ink">Try the demo</Link>
          </div>
          <p className="mt-8 text-sm text-muted">Voters sign in with their email address. No wallet, no app to install.</p>
        </div>
        <ReceiptSlip />
      </section>

      <Stats />

      <section id="how" className="mx-auto grid max-w-6xl scroll-mt-20 gap-10 px-4 py-20 lg:grid-cols-[300px_1fr]">
        <div>
          <h2 className="font-display text-[32px] font-semibold leading-tight tracking-[-0.01em]">How an election runs</h2>
          <p className="mt-3 text-muted">From an empty ballot to published results, usually within a week.</p>
        </div>
        <ol>
          {steps.map(([title, text], i) => (
            <li key={title} className="grid grid-cols-[56px_1fr] gap-4 border-t border-line py-6 last:border-b">
              <span className="font-display text-[28px] font-semibold leading-none text-primary tabular-nums">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 max-w-xl text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="features" className="scroll-mt-20 border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-[32px] font-semibold leading-tight tracking-[-0.01em]">What the contract enforces</h2>
            <p className="mt-3 text-muted">These aren't promises in a policy document. They are checks in the smart contract's code, so not even our own servers can skip them.</p>
          </div>
          <div className="mt-10 border-t border-ink/80">
            {rules.map(([rule, text, code]) => (
              <div key={rule} className="grid gap-2 border-b border-line py-5 sm:grid-cols-[240px_1fr_auto] sm:items-baseline sm:gap-8">
                <div className="font-semibold">{rule}</div>
                <p className="text-muted">{text}</p>
                <code className="justify-self-start rounded-[3px] bg-surface-2 px-2 py-1 font-mono text-xs text-primary-ink">{code}</code>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-20 lg:grid-cols-[300px_1fr]">
        <h2 className="font-display text-[32px] font-semibold leading-tight tracking-[-0.01em]">Built for the elections people actually run</h2>
        <ul>
          {uses.map(([who, what]) => (
            <li key={who} className="flex flex-col gap-1 border-t border-line py-4 last:border-b sm:flex-row sm:gap-6">
              <span className="font-semibold sm:w-56 sm:shrink-0">{who}</span>
              <span className="text-muted">{what}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-ink text-bg">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-4 py-16 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-[30px] font-semibold leading-tight">Planning an election this term?</h2>
            <p className="mt-2 max-w-xl text-bg/70">Register your organization, upload your voter list, and publish when you're ready. We cover the blockchain fees.</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Button size="lg" to="/register" className="bg-bg text-ink hover:bg-surface-2">Register your organization</Button>
            <Link to="/verify" className="font-medium text-bg underline decoration-bg/40 underline-offset-4 hover:decoration-bg">See live results</Link>
          </div>
        </div>
      </section>
    </>
  )
}
