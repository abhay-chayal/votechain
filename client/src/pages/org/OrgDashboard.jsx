import { Link } from 'react-router-dom'
import { Activity, AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, ClipboardList, Pencil, PlusCircle, Send, Users, Vote } from 'lucide-react'
import { Async, Button, Card, CardHeader, Countdown, EmptyState, PageHeader, StatCard, StatusBadge } from '../../components/ui'
import { TurnoutChart } from '../../components/election'
import { useApi } from '../../lib/useApi'
import { useAuth } from '../../store/auth'
import { electionStatus, fmtNum, relTime, turnout } from '../../lib/utils'

const ICONS = { vote: Vote, invite: Send, open: CalendarClock, edit: Pencil, publish: CheckCircle2 }

export default function OrgDashboard() {
  const { user } = useAuth()
  const q = useApi('/org/overview', { interval: 20_000 })
  const firstName = user.name.replace(/^(Dr|Prof)\.\s*/, '').split(' ')[0]

  return (
    <>
      <PageHeader title={`Welcome back, ${firstName}`} subtitle={user.org?.name} actions={<Button to="/org/elections/new"><PlusCircle className="size-4" />New election</Button>} />
      <Async q={q}>
        {({ org, members, elections, activity }) => {
          const live = elections.filter((e) => electionStatus(e) === 'live')
          const upcoming = elections.filter((e) => ['scheduled', 'draft'].includes(electionStatus(e)))
          const done = elections.filter((e) => ['closed', 'published'].includes(electionStatus(e)))
          const avgTurnout = done.length ? (done.reduce((a, e) => a + turnout(e), 0) / done.length).toFixed(1) + '%' : '—'
          const featured = live[0]
          return (
            <>
              {org.status !== 'active' && (
                <Card className="mb-6 flex gap-3 border-warning/40 bg-warning-soft p-4 text-sm">
                  <AlertTriangle className="size-5 shrink-0 text-warning" />
                  <div>
                    <div className="font-medium">{org.status === 'pending' ? 'Your organization is awaiting approval' : 'Your organization is suspended'}</div>
                    <p className="mt-0.5 text-muted">{org.status === 'pending' ? 'You can prepare elections and voter lists now. Publishing opens once a VoteChain admin approves you.' : 'Contact VoteChain support to restore access.'}</p>
                  </div>
                </Card>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Live elections" value={live.length} icon={Activity} tone="success" hint={`${upcoming.length} upcoming or draft`} />
                <StatCard label="Invited members" value={fmtNum(members)} icon={Users} tone="info" hint="Unique voters across elections" />
                <StatCard label="Votes in live elections" value={fmtNum(live.reduce((a, e) => a + e.votesCast, 0))} icon={Vote} />
                <StatCard label="Average final turnout" value={avgTurnout} icon={ClipboardList} tone="warning" hint={`Across ${done.length} completed elections`} />
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
                {featured ? (
                  <Card>
                    <CardHeader title={featured.title} subtitle={`${fmtNum(featured.votesCast)} of ${fmtNum(featured.eligible)} voted · ${turnout(featured)}% turnout`} action={<StatusBadge status="live" />} />
                    <div className="p-5">
                      <TurnoutChart series={featured.turnoutSeries} eligible={featured.eligible} />
                      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <Countdown to={featured.endAt} label="Closes in" />
                        <Button variant="secondary" to={`/org/elections/${featured.id}`}>Manage <ArrowRight className="size-4" /></Button>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Card><EmptyState icon={CalendarClock} title="No live elections" text="Create an election and publish it to go live." action={<Button to="/org/elections/new">New election</Button>} /></Card>
                )}
                <Card>
                  <CardHeader title="Recent activity" />
                  {activity.length ? (
                    <ul className="divide-y divide-line">
                      {activity.slice(0, 6).map((a, i) => {
                        const Icon = ICONS[a.kind] || Activity
                        return (
                          <li key={i} className="flex gap-3 px-5 py-3 text-sm">
                            <span className="mt-0.5 rounded-md bg-surface-2 p-1.5 text-muted"><Icon className="size-3.5" /></span>
                            <div className="min-w-0"><p className="leading-snug">{a.text}</p><p className="mt-0.5 text-xs text-muted">{relTime(a.at)}</p></div>
                          </li>
                        )
                      })}
                    </ul>
                  ) : <p className="px-5 py-8 text-center text-sm text-muted">Nothing yet.</p>}
                </Card>
              </div>

              <Card className="mt-6">
                <CardHeader title="Upcoming and drafts" action={<Link to="/org/elections" className="text-sm font-medium text-primary hover:underline">View all</Link>} />
                {upcoming.length ? (
                  <ul className="divide-y divide-line">
                    {upcoming.map((e) => (
                      <li key={e.id}>
                        <Link to={`/org/elections/${e.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-surface-2/60">
                          <div className="min-w-0">
                            <div className="truncate font-medium">{e.title}</div>
                            <div className="text-sm text-muted">{e.candidates.length} candidates · {fmtNum(e.eligible)} voters · opens {relTime(e.startAt)}</div>
                          </div>
                          <StatusBadge status={electionStatus(e)} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : <p className="px-5 py-8 text-center text-sm text-muted">Nothing scheduled.</p>}
              </Card>
            </>
          )
        }}
      </Async>
    </>
  )
}
