import { CheckCircle2, Inbox } from 'lucide-react'
import { Button, Card, EmptyState, PageHeader } from '../../components/ui'
import { ElectionCard } from '../../components/election'
import { useStore } from '../../store/AppStore'
import { electionStatus } from '../../lib/utils'

export default function VoterHome() {
  const { user, elections, orgById, myVotes } = useStore()
  const mine = elections.filter((e) => user.orgIds.includes(e.orgId) && e.state !== 'draft')
  const st = (e) => electionStatus(e)
  const toVote = mine.filter((e) => st(e) === 'live' && !myVotes[e.id])
  const voted = mine.filter((e) => st(e) === 'live' && myVotes[e.id])
  const upcoming = mine.filter((e) => st(e) === 'scheduled')
  const past = mine.filter((e) => ['closed', 'published'].includes(st(e)))

  const Section = ({ title, list, empty, footer }) => (
    <section className="mt-8">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      {list.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((e) => <ElectionCard key={e.id} election={e} org={orgById(e.orgId)} to={`/vote/elections/${e.id}`} footer={footer?.(e)} />)}
        </div>
      ) : <p className="text-sm text-muted">{empty}</p>}
    </section>
  )

  return (
    <>
      <PageHeader title={`Hi, ${user.name.split(' ')[0]}`} subtitle={toVote.length ? `${toVote.length} election${toVote.length > 1 ? 's are' : ' is'} waiting for your vote.` : "You're all caught up."} />

      {toVote.length ? (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Vote now</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {toVote.map((e) => (
              <ElectionCard key={e.id} election={e} org={orgById(e.orgId)} to={`/vote/elections/${e.id}`}
                footer={<Button className="w-full" to={`/vote/elections/${e.id}/ballot`}>Vote now</Button>} />
            ))}
          </div>
        </section>
      ) : (
        <Card><EmptyState icon={Inbox} title="No open ballots" text="When one of your organizations opens an election, it'll appear here and we'll email you." /></Card>
      )}

      {!!voted.length && (
        <Section title="Voted, results pending" list={voted}
          footer={(e) => <Button variant="soft" className="w-full" to={`/vote/receipt/${e.id}`}><CheckCircle2 className="size-4" />View receipt</Button>} />
      )}
      <Section title="Upcoming" list={upcoming} empty="Nothing scheduled yet." />
      <Section title="Past elections" list={past} empty="No past elections." footer={(e) => <Button variant="secondary" className="w-full" to={`/verify/${e.id}`}>See results</Button>} />
    </>
  )
}
