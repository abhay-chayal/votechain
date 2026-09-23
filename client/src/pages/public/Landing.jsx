import {
  ArrowRight, BadgeCheck, Blocks, Building2, CheckCircle2, EyeOff, FileSearch, GraduationCap, Home,
  Landmark, Lock, Users, Wallet, Zap,
} from 'lucide-react'
import { Badge, Button, Card, Hash } from '../../components/ui'
import { useStore } from '../../store/AppStore'
import { fmtNum, totalVotes } from '../../lib/utils'

const features = [
  { icon: Lock, title: 'Tamper-proof votes', text: 'Every ballot is a transaction on Ethereum. Once confirmed, nobody can edit, delete or replace it, not even us.' },
  { icon: BadgeCheck, title: 'One member, one vote', text: 'The smart contract rejects a second vote from the same voter token, so duplicates are impossible, not just discouraged.' },
  { icon: EyeOff, title: 'Secret ballot', text: 'Only a hashed voter token goes on-chain. Totals stay sealed until the election closes.' },
  { icon: FileSearch, title: 'Anyone can verify', text: 'Every voter gets a receipt. Anyone can match totals and transactions against the public chain.' },
  { icon: Wallet, title: 'No crypto wallet needed', text: 'Voters sign in with email. VoteChain pays the gas, so voting feels like any other website.' },
  { icon: Zap, title: 'Set up in minutes', text: 'Create an election, add candidates, upload a voter CSV and go live. Results publish automatically.' },
]

const audiences = [
  { icon: GraduationCap, label: 'Colleges & universities' }, { icon: Building2, label: 'Company boards' },
  { icon: Home, label: 'Housing societies' }, { icon: Landmark, label: 'NGOs & trusts' },
  { icon: Users, label: 'Clubs & communities' }, { icon: BadgeCheck, label: 'Shareholder votes' },
]

const steps = [
  ['Create', 'Register your organization and set up an election: dates, candidates and ballot.'],
  ['Invite', 'Upload your voter list. Each member gets a private invite by email.'],
  ['Vote', 'Voters sign in, pick a candidate and get an on-chain receipt in seconds.'],
  ['Verify', 'At closing time, results publish automatically and anyone can check them on the chain.'],
]

export default function Landing() {
  const { elections } = useStore()
  const live = elections.find((e) => e.id === 'el-council-26')
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_70%_0%,var(--primary-soft),transparent)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:py-24 lg:grid-cols-[1.1fr_1fr]">
          <div className="animate-fade-in">
            <Badge tone="primary"><Blocks className="size-3.5" />Votes recorded on Ethereum</Badge>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
              Elections your members can <span className="text-primary">verify</span>, not just trust.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              VoteChain lets any college, company, society or club run a secure online election. Every vote is recorded on the blockchain and can be checked by anyone.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" to="/register">Start an election <ArrowRight className="size-4" /></Button>
              <Button size="lg" variant="secondary" to="/login">Try the demo</Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              {['Free for up to 500 voters', 'No wallet for voters', 'Results in real time at close'].map((t) => (
                <span key={t} className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-success" />{t}</span>
              ))}
            </div>
          </div>

          <Card className="animate-fade-in p-6 shadow-xl shadow-primary/5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted">Vote receipt</span>
              <Badge tone="success"><CheckCircle2 className="size-3.5" />Confirmed</Badge>
            </div>
            <div className="mt-4 text-lg font-semibold">{live?.title}</div>
            <div className="text-sm text-muted">Northfield Institute of Technology</div>
            <dl className="mt-6 space-y-3 text-sm">
              {[
                ['Receipt code', <span className="font-mono">VC-8F3A-21C9</span>],
                ['Transaction', <Hash value="0x7d1c9e2a4b8f03e6d5c2a1b9f8e7d6c5b4a39281706f5e4d3c2b1a0f9e8d7c6b" />],
                ['Block', '#6,899,997'],
                ['Your choice', <span className="flex items-center gap-1.5 text-muted"><Lock className="size-3.5" />Sealed until close</span>],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 border-b border-line pb-3 last:border-0">
                  <dt className="text-muted">{k}</dt><dd className="min-w-0 text-right">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 rounded-lg bg-surface-2 px-4 py-3 text-sm">
              <span className="font-semibold">{fmtNum(totalVotes(live || { tally: {} }))}</span>
              <span className="text-muted"> of {fmtNum(live?.eligible || 0)} students have voted so far</span>
            </div>
          </Card>
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <p className="mb-5 text-center text-sm font-medium text-muted">Built for every kind of organization</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {audiences.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-muted">
                <Icon className="size-4 shrink-0" />{label}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight">Why VoteChain</h2>
          <p className="mt-3 text-muted">In a normal online voting tool, one database decides the result. VoteChain puts the votes on a public ledger that no single admin controls.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <Card key={title} className="p-6">
              <span className="inline-flex rounded-lg bg-primary-soft p-2.5 text-primary"><Icon className="size-5" /></span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="how" className="scroll-mt-20 border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-4">
            {steps.map(([t, d], i) => (
              <li key={t} className="relative">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary font-semibold text-white">{i + 1}</span>
                <h3 className="mt-4 font-semibold">{t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <Card className="flex flex-col items-start justify-between gap-6 bg-primary p-8 text-white sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="text-2xl font-bold">Run your next election on VoteChain</h2>
            <p className="mt-2 text-white/80">Set up in 10 minutes. Your members get an on-chain receipt for every vote.</p>
          </div>
          <div className="flex gap-3">
            <Button size="lg" to="/register" className="bg-white text-primary hover:bg-white/90">Get started</Button>
            <Button size="lg" to="/verify" className="border border-white/40 bg-transparent text-white hover:bg-white/10">See live results</Button>
          </div>
        </Card>
      </section>
    </>
  )
}
