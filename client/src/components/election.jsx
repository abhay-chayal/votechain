import { Link } from 'react-router-dom'
import { CalendarClock, Lock, Trophy, Users } from 'lucide-react'
import { Avatar, Badge, Card, Progress, StatusBadge } from './ui'
import { cn, electionStatus, fmtDateTime, fmtNum, relTime, totalVotes, turnout } from '../lib/utils'

export function ElectionCard({ election, org, to, footer }) {
  const status = electionStatus(election)
  return (
    <Card className="flex flex-col p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <Badge>{election.category}</Badge>
        <StatusBadge status={status} />
      </div>
      <Link to={to} className="mt-3 font-semibold leading-snug hover:text-primary">{election.title}</Link>
      {org && <p className="mt-1 text-sm text-muted">{org.name}</p>}
      <div className="mt-4 space-y-2 text-sm text-muted">
        <div className="flex items-center gap-2">
          <CalendarClock className="size-4" />
          {status === 'scheduled' && <>Opens {relTime(election.startAt)}</>}
          {status === 'live' && <>Closes {relTime(election.endAt)}</>}
          {(status === 'closed' || status === 'published') && <>Closed {fmtDateTime(election.closedAt || election.endAt)}</>}
          {status === 'draft' && <>Draft · planned {fmtDateTime(election.startAt)}</>}
        </div>
        <div className="flex items-center gap-2"><Users className="size-4" />{election.candidates.length} candidates · {fmtNum(election.eligible)} eligible</div>
      </div>
      {status === 'live' && (
        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-xs text-muted"><span>Turnout</span><span>{turnout(election)}%</span></div>
          <Progress value={turnout(election)} />
        </div>
      )}
      {footer && <div className="mt-5 flex gap-2 border-t border-line pt-4">{footer}</div>}
    </Card>
  )
}

export function ResultsBars({ election }) {
  const total = totalVotes(election)
  const rows = [...election.candidates]
    .map((c) => ({ ...c, votes: election.tally[c.id] || 0 }))
    .sort((a, b) => b.votes - a.votes)
  const top = rows[0]?.votes
  return (
    <div className="space-y-4">
      {rows.map((c, i) => {
        const pct = total ? (c.votes / total) * 100 : 0
        const winner = i === 0 && c.votes > 0 && c.votes === top && rows[1]?.votes !== top
        return (
          <div key={c.id}>
            <div className="mb-1.5 flex items-center gap-3">
              <Avatar name={c.name} size={32} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-medium">
                  <span className="truncate">{c.name}</span>
                  {winner && <Badge tone="success"><Trophy className="size-3" />Winner</Badge>}
                </div>
                <div className="truncate text-xs text-muted">{c.title}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold tabular-nums">{pct.toFixed(1)}%</div>
                <div className="text-xs text-muted tabular-nums">{fmtNum(c.votes)} {c.votes === 1 ? "vote" : "votes"}</div>
              </div>
            </div>
            <Progress value={pct} className="h-2.5" tone={winner ? 'bg-primary' : 'bg-muted/45'} />
          </div>
        )
      })}
    </div>
  )
}

export const SealedResults = ({ election }) => (
  <div className="flex flex-col items-center rounded-lg border border-dashed border-line bg-surface-2/50 px-6 py-10 text-center">
    <span className="mb-3 rounded-full bg-surface p-3 text-muted"><Lock className="size-5" /></span>
    <h4 className="font-semibold">Results are sealed until voting closes</h4>
    <p className="mt-1 max-w-sm text-sm text-muted">
      The contract won't reveal totals before {fmtDateTime(election.endAt)}. No one, including the organizer, can see who is ahead.
    </p>
  </div>
)

// Cumulative turnout over time, drawn as a small area chart.
export function TurnoutChart({ series, eligible, className }) {
  if (!series?.length) return <p className="py-8 text-center text-sm text-muted">No votes yet.</p>
  const W = 600, H = 180, P = 8
  const max = Math.max(eligible * 0.8, ...series)
  const pts = series.map((v, i) => [P + (i / Math.max(1, series.length - 1)) * (W - 2 * P), H - P - (v / max) * (H - 2 * P)])
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn('h-44 w-full', className)} preserveAspectRatio="none" role="img" aria-label="Turnout over time">
      <defs>
        <linearGradient id="tfill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--primary)" stopOpacity=".25" />
          <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((g) => <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke="var(--line)" strokeDasharray="4 4" />)}
      <path d={`${line} L${pts.at(-1)[0]},${H} L${pts[0][0]},${H} Z`} fill="url(#tfill)" />
      <path d={line} fill="none" stroke="var(--primary)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      <circle cx={pts.at(-1)[0]} cy={pts.at(-1)[1]} r="4" fill="var(--primary)" />
    </svg>
  )
}
