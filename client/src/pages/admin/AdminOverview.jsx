import { Link } from 'react-router-dom'
import { AlertTriangle, Building2, ClipboardList, Fuel, Vote } from 'lucide-react'
import { Avatar, Button, Card, CardHeader, PageHeader, StatCard, StatusBadge } from '../../components/ui'
import { useStore } from '../../store/AppStore'
import { electionStatus, fmtNum, relTime, totalVotes } from '../../lib/utils'

export default function AdminOverview() {
  const { organizations, elections, orgById } = useStore()
  const pending = organizations.filter((o) => o.status === 'pending')
  const live = elections.filter((e) => electionStatus(e) === 'live')
  const votes = elections.reduce((a, e) => a + totalVotes(e), 0)

  const alerts = [
    { tone: 'danger', text: 'QuickPoll Rewards suspended: 2,000 invites sent from one IP range in 3 minutes', at: organizations.find((o) => o.id === 'org-quickpoll')?.createdAt },
    { tone: 'warning', text: 'Relayer balance below 0.5 ETH. Top up before the weekend elections.', at: new Date(Date.now() - 3_600_000 * 3).toISOString() },
  ]

  return (
    <>
      <PageHeader title="Platform overview" subtitle="All organizations and elections on VoteChain." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Organizations" value={organizations.length} icon={Building2} hint={`${pending.length} awaiting review`} tone="info" />
        <StatCard label="Live elections" value={live.length} icon={ClipboardList} tone="success" hint={`${elections.length} total`} />
        <StatCard label="Votes recorded" value={fmtNum(votes)} icon={Vote} hint="All time, on-chain" />
        <StatCard label="Relayer balance" value="0.42 ETH" icon={Fuel} tone="warning" hint="≈ 10,200 votes left" />
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
          <ul className="divide-y divide-line">
            {alerts.map((a) => (
              <li key={a.text} className="flex gap-3 px-5 py-3.5 text-sm">
                <AlertTriangle className={`mt-0.5 size-4 shrink-0 ${a.tone === 'danger' ? 'text-danger' : 'text-warning'}`} />
                <div><p>{a.text}</p><p className="mt-0.5 text-xs text-muted">{relTime(a.at)}</p></div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Live now" />
        <ul className="divide-y divide-line">
          {live.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div className="min-w-0"><div className="truncate font-medium">{e.title}</div><div className="text-xs text-muted">{orgById(e.orgId)?.name} · {fmtNum(totalVotes(e))} votes · closes {relTime(e.endAt)}</div></div>
              <StatusBadge status="live" />
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}
