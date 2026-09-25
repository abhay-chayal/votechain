import { Link } from 'react-router-dom'
import { AlertTriangle, Building2, ClipboardList, Fuel, Vote } from 'lucide-react'
import { Async, Avatar, Button, Card, CardHeader, PageHeader, StatCard, StatusBadge } from '../../components/ui'
import { useApi } from '../../lib/useApi'
import { electionStatus, fmtNum, relTime } from '../../lib/utils'

// Rough gas per vote on the current contract, used to estimate how many votes the relayer can still pay for.
const ETH_PER_VOTE = 0.000_08

export default function AdminOverview() {
  const q = useApi('/admin/overview', { interval: 30_000 })
  return (
    <>
      <PageHeader title="Platform overview" subtitle="All organizations and elections on VoteChain." />
      <Async q={q}>
        {({ organizations, elections, votes, chain, failedLast24h }) => {
          const pending = organizations.filter((o) => o.status === 'pending')
          const live = elections.filter((e) => electionStatus(e) === 'live')
          const lowBalance = chain.ok && chain.balanceEth < 0.05
          const alerts = [
            ...(!chain.ok ? [{ tone: 'danger', text: `Blockchain node unreachable: ${chain.error || 'no response'}` }] : []),
            ...(lowBalance ? [{ tone: 'warning', text: `Relayer balance is low (${chain.balanceEth.toFixed(4)} ETH). Top it up before the next election.` }] : []),
            ...(failedLast24h ? [{ tone: 'warning', text: `${failedLast24h} transactions were rejected by the contract in the last 24 hours. See System health.` }] : []),
          ]
          return (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Organizations" value={organizations.length} icon={Building2} hint={`${pending.length} awaiting review`} tone="info" />
                <StatCard label="Live elections" value={live.length} icon={ClipboardList} tone="success" hint={`${elections.length} published in total`} />
                <StatCard label="Votes recorded" value={fmtNum(votes)} icon={Vote} hint="All time, on-chain" />
                <StatCard label="Relayer balance" value={chain.ok ? `${chain.balanceEth.toFixed(3)} ETH` : '—'} icon={Fuel} tone={lowBalance ? 'danger' : 'warning'}
                  hint={chain.ok ? `≈ ${fmtNum(Math.floor(chain.balanceEth / ETH_PER_VOTE))} votes left` : 'Node offline'} />
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader title="Awaiting approval" action={<Link to="/admin/organizations" className="text-sm font-medium text-primary hover:underline">Review all</Link>} />
                  {pending.length ? (
                    <ul className="divide-y divide-line">
                      {pending.map((o) => (
                        <li key={o.id} className="flex items-center gap-3 px-5 py-3.5">
                          <Avatar name={o.name} size={36} />
                          <div className="min-w-0 flex-1"><div className="truncate font-medium">{o.name}</div><div className="text-xs text-muted">{o.type} · {fmtNum(o.members)} members · applied {relTime(o.createdAt)}</div></div>
                          <Button size="sm" variant="secondary" to="/admin/organizations">Review</Button>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="px-5 py-8 text-center text-sm text-muted">No pending organizations.</p>}
                </Card>
                <Card>
                  <CardHeader title="Alerts" />
                  {alerts.length ? (
                    <ul className="divide-y divide-line">
                      {alerts.map((a) => (
                        <li key={a.text} className="flex gap-3 px-5 py-3.5 text-sm">
                          <AlertTriangle className={`mt-0.5 size-4 shrink-0 ${a.tone === 'danger' ? 'text-danger' : 'text-warning'}`} />
                          <p>{a.text}</p>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="px-5 py-8 text-center text-sm text-muted">All systems normal.</p>}
                </Card>
              </div>

              <Card className="mt-6">
                <CardHeader title="Live now" />
                {live.length ? (
                  <ul className="divide-y divide-line">
                    {live.map((e) => (
                      <li key={e.id}>
                        <Link to={`/verify/${e.id}`} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-surface-2/60">
                          <div className="min-w-0"><div className="truncate font-medium">{e.title}</div><div className="text-xs text-muted">{e.orgName} · {fmtNum(e.votesCast)} votes · closes {relTime(e.endAt)}</div></div>
                          <StatusBadge status="live" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : <p className="px-5 py-8 text-center text-sm text-muted">No elections are live right now.</p>}
              </Card>
            </>
          )
        }}
      </Async>
    </>
  )
}
