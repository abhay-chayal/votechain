import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react'
import { Async, Avatar, Badge, Button, Card, CardHeader, Countdown, StatusBadge } from '../../components/ui'
import { ResultsBars } from '../../components/election'
import { useApi } from '../../lib/useApi'
import { useAuth } from '../../store/auth'
import { electionStatus, fmtDateTime } from '../../lib/utils'

export default function VoterElection() {
  const { id } = useParams()
  const { user } = useAuth()
  const q = useApi(`/voter/elections/${id}`)

  return (
    <>
      <Link to="/vote" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" />My elections</Link>
      <Async q={q}>
        {({ election: e, receipt: mine }) => {
          const status = electionStatus(e)
          const ended = status === 'closed' || status === 'published'
          const org = user.orgs?.find((o) => o.id === e.orgId)
          return (
            <>
              <Card className="overflow-hidden">
                <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-2xl">
                    <div className="flex flex-wrap gap-2"><StatusBadge status={status} /><Badge>{e.category}</Badge></div>
                    <h1 className="mt-3 font-display text-[28px] font-semibold leading-tight tracking-[-0.01em] sm:text-[34px]">{e.title}</h1>
                    <p className="mt-1 text-sm text-muted">{org?.name} · {fmtDateTime(e.startAt)} – {fmtDateTime(e.closedAt || e.endAt)}</p>
                    <p className="mt-4 whitespace-pre-line text-muted">{e.description}</p>
                  </div>
                  <div className="shrink-0">
                    {status === 'live' && <Countdown to={e.endAt} label="Closes in" />}
                    {status === 'scheduled' && <Countdown to={e.startAt} label="Opens in" />}
                  </div>
                </div>
                <div className="flex flex-col gap-3 border-t border-line bg-surface-2/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                  {mine ? (
                    <>
                      <span className="flex items-center gap-2 text-sm font-medium text-success"><CheckCircle2 className="size-5" />You voted on {fmtDateTime(mine.castAt)}</span>
                      <Button variant="secondary" to={`/vote/receipt/${e.id}`}>View receipt</Button>
                    </>
                  ) : status === 'live' ? (
                    <>
                      <span className="flex items-center gap-2 text-sm text-muted"><ShieldCheck className="size-5 shrink-0 text-primary" />Your vote is secret and recorded on-chain. You can vote once.</span>
                      <Button to={`/vote/elections/${e.id}/ballot`}>Go to ballot</Button>
                    </>
                  ) : (
                    <span className="text-sm text-muted">{status === 'scheduled' ? 'The ballot opens when voting starts.' : "Voting has closed. You didn't vote in this election."}</span>
                  )}
                </div>
              </Card>

              {ended && e.tally && (
                <Card className="mt-6">
                  <CardHeader title="Results" action={<Link to={`/verify/${e.id}`} className="text-sm font-medium text-primary hover:underline">Verify on-chain</Link>} />
                  <div className="p-5"><ResultsBars election={e} /></div>
                </Card>
              )}

              <h2 className="mb-4 mt-8 text-lg font-semibold">Candidates</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {e.candidates.map((c) => (
                  <Card key={c.id} className="p-5">
                    <div className="flex items-center gap-4">
                      <Avatar name={c.name} size={56} />
                      <div className="min-w-0"><div className="text-lg font-semibold">{c.name}</div><div className="text-sm text-muted">{c.title}</div></div>
                    </div>
                    {c.bio && <p className="mt-4 text-sm text-muted">{c.bio}</p>}
                    {!!c.manifesto.length && (
                      <>
                        <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Manifesto</h4>
                        <ul className="mt-2 space-y-1.5 text-sm">{c.manifesto.map((m) => <li key={m} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />{m}</li>)}</ul>
                      </>
                    )}
                  </Card>
                ))}
              </div>
            </>
          )
        }}
      </Async>
    </>
  )
}
