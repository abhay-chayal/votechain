import { CheckCircle2, Inbox } from 'lucide-react'
import { Async, Button, Card, EmptyState, PageHeader } from '../../components/ui'
import { ElectionCard } from '../../components/election'
import { useApi } from '../../lib/useApi'
import { useAuth } from '../../store/auth'
import { electionStatus } from '../../lib/utils'

function Section({ title, list, empty, orgs, footer }) {
  return (
    <section className="mt-8">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      {list.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((e) => <ElectionCard key={e.id} election={e} org={orgs.get(e.orgId)} to={`/vote/elections/${e.id}`} footer={footer?.(e)} />)}
        </div>
      ) : <p className="text-sm text-muted">{empty}</p>}
    </section>
  )
}

export default function VoterHome() {
  const { user } = useAuth()
  const q = useApi('/voter/elections', { interval: 30_000 })
  const orgs = new Map((user.orgs || []).map((o) => [o.id, o]))

  return (
    <Async q={q}>
      {({ elections }) => {
        const st = (e) => electionStatus(e)
        const toVote = elections.filter((e) => st(e) === 'live' && !e.hasVoted)
        const voted = elections.filter((e) => st(e) === 'live' && e.hasVoted)
        const upcoming = elections.filter((e) => st(e) === 'scheduled')
        const past = elections.filter((e) => ['closed', 'published'].includes(st(e)))
        return (
          <>
            <PageHeader title={`Hi, ${user.name.split(' ')[0]}`} subtitle={toVote.length ? `${toVote.length} election${toVote.length > 1 ? 's are' : ' is'} waiting for your vote.` : "You're all caught up."} />
            {toVote.length ? (
              <section>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Vote now</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {toVote.map((e) => (
                    <ElectionCard key={e.id} election={e} org={orgs.get(e.orgId)} to={`/vote/elections/${e.id}`}
                      footer={<Button className="w-full" to={`/vote/elections/${e.id}/ballot`}>Vote now</Button>} />
                  ))}
                </div>
              </section>
            ) : (
              <Card><EmptyState icon={Inbox} title="No open ballots" text="When one of your organizations opens an election, it'll appear here and you'll get an email." /></Card>
            )}
            {!!voted.length && (
              <Section title="Voted, results pending" list={voted} orgs={orgs}
                footer={(e) => <Button variant="soft" className="w-full" to={`/vote/receipt/${e.id}`}><CheckCircle2 className="size-4" />View receipt</Button>} />
            )}
            <Section title="Upcoming" list={upcoming} orgs={orgs} empty="Nothing scheduled yet." />
            <Section title="Past elections" list={past} orgs={orgs} empty="No past elections." footer={(e) => <Button variant="secondary" className="w-full" to={`/vote/elections/${e.id}`}>See results</Button>} />
          </>
        )
      }}
    </Async>
  )
}
