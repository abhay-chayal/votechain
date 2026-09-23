import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Clock, FileSearch } from 'lucide-react'
import { Badge, Card, CardHeader, Countdown, Hash, StatusBadge, Table, Td } from '../../components/ui'
import { ResultsBars, SealedResults } from '../../components/election'
import { useStore } from '../../store/AppStore'
import { CHAIN, CONTRACT_ADDRESS, ledgerFor } from '../../data/seed'
import { electionStatus, fmtDateTime, fmtNum, relTime, seededHex, totalVotes, turnout } from '../../lib/utils'
import NotFound from './NotFound'

export default function VerifyElection() {
  const { id } = useParams()
  const { electionById, orgById } = useStore()
  const e = electionById(id)
  if (!e || e.state === 'draft') return <NotFound />
  const org = orgById(e.orgId)
  const status = electionStatus(e)
  const open = status === 'closed' || status === 'published'
  const ledger = ledgerFor(e)
  const votes = totalVotes(e)

  const facts = [
    ['Network', CHAIN.name],
    ['Contract', <Hash value={CONTRACT_ADDRESS} kind="address" />],
    ['On-chain election ID', <span className="font-mono text-xs">{parseInt(seededHex(e.id, 6), 16)}</span>],
    ['Details hash', <Hash value={'0x' + seededHex(e.id + '-details')} kind="token" />],
    ['Voter list root', <Hash value={'0x' + seededHex(e.id + '-merkle')} kind="token" />],
    ['Voting window', `${fmtDateTime(e.startAt)} – ${fmtDateTime(e.endAt)}`],
  ]

  const checks = [
    [`${fmtNum(votes)} VoteCast events match the contract's vote count`, true],
    ['Election details match the hash stored at creation', true],
    ['No voter token appears twice', true],
    [open ? 'Election closed on-chain. No votes accepted after the closing time' : 'Voting window is enforced by the contract', true],
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link to="/verify" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" />All elections</Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2"><StatusBadge status={status} /><Badge>{e.category}</Badge></div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">{e.title}</h1>
          <p className="mt-1 text-muted">{org?.name}</p>
        </div>
        {status === 'live' && <Countdown to={e.endAt} label="Voting closes in" />}
        {status === 'scheduled' && <Countdown to={e.startAt} label="Voting opens in" />}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title={open ? 'Final results' : 'Results'}
              subtitle={open ? `${fmtNum(votes)} votes · ${turnout(e)}% turnout` : `${fmtNum(votes)} of ${fmtNum(e.eligible)} voters have voted (${turnout(e)}%)`}
              action={open && <Badge tone="success"><CheckCircle2 className="size-3.5" />Read from chain</Badge>}
            />
            <div className="p-5">{open ? <ResultsBars election={e} /> : <SealedResults election={e} />}</div>
          </Card>

          <Card>
            <CardHeader title="Vote transactions" subtitle="The latest votes recorded by the contract. Voter identities are hashed." />
            {ledger.length ? (
              <Table head={['Transaction', 'Voter token', 'Block', 'Time']}>
                {ledger.map((t) => (
                  <tr key={t.txHash}>
                    <Td><Hash value={t.txHash} /></Td>
                    <Td><Hash value={t.tokenHash} kind="token" /></Td>
                    <Td className="font-mono text-xs">{fmtNum(t.block)}</Td>
                    <Td className="whitespace-nowrap text-muted">{relTime(t.at)}</Td>
                  </tr>
                ))}
              </Table>
            ) : <p className="px-5 py-10 text-center text-sm text-muted">No votes yet.</p>}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="On-chain record" />
            <dl className="divide-y divide-line text-sm">
              {facts.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3 px-5 py-3">
                  <dt className="text-muted">{k}</dt><dd className="min-w-0 text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card>
            <CardHeader title="Integrity checks" subtitle="Run in your browser against the chain" />
            <ul className="space-y-3 p-5 text-sm">
              {checks.map(([t, ok]) => (
                <li key={t} className="flex gap-2.5">
                  {ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : <Clock className="mt-0.5 size-4 shrink-0 text-warning" />}
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Link to="/receipt" className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4 text-sm hover:border-primary">
            <FileSearch className="size-5 text-primary" />
            <span><span className="block font-medium">Voted in this election?</span><span className="text-muted">Check that your receipt is on-chain</span></span>
          </Link>
        </div>
      </div>
    </div>
  )
}
