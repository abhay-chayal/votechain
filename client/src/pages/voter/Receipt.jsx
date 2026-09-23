import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { CheckCircle2, Lock, Printer, ShieldCheck } from 'lucide-react'
import { Button, Card, CopyButton, Hash } from '../../components/ui'
import { useStore } from '../../store/AppStore'
import { CHAIN, CONTRACT_ADDRESS } from '../../data/seed'
import { electionStatus, fmtDateTime, fmtNum } from '../../lib/utils'

export default function Receipt() {
  const { id } = useParams()
  const { state } = useLocation()
  const { electionById, orgById, myVotes } = useStore()
  const e = electionById(id)
  const r = myVotes[id]
  if (!e || !r) return <Navigate to="/vote" replace />
  const ended = ['closed', 'published'].includes(electionStatus(e))
  const choice = e.candidates.find((c) => c.id === r.candidateId)

  const rows = [
    ['Election', e.title],
    ['Organization', orgById(e.orgId)?.name],
    ['Recorded', fmtDateTime(r.castAt)],
    ['Network', CHAIN.name],
    ['Contract', <Hash value={CONTRACT_ADDRESS} kind="address" />],
    ['Transaction', <Hash value={r.txHash} />],
    ['Block', `#${fmtNum(r.block)}`],
  ]

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <span className="inline-flex rounded-full bg-success-soft p-4 text-success"><CheckCircle2 className="size-8" /></span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">{state?.fresh ? 'Your vote is recorded' : 'Vote receipt'}</h1>
        <p className="mt-1 text-muted">It's permanently on the blockchain. Keep this receipt code to check it later.</p>
      </div>

      <Card className="mt-8 overflow-hidden print:border-0">
        <div className="flex items-center justify-between gap-3 border-b border-dashed border-line bg-surface-2/50 px-6 py-5">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted">Receipt code</div>
            <div className="mt-1 font-mono text-2xl font-semibold tracking-wider">{r.receipt}</div>
          </div>
          <CopyButton value={r.receipt} className="p-2" />
        </div>
        <dl className="divide-y divide-line text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 px-6 py-3"><dt className="shrink-0 text-muted">{k}</dt><dd className="min-w-0 text-right">{v}</dd></div>
          ))}
          <div className="flex items-center justify-between gap-4 px-6 py-3">
            <dt className="text-muted">Your choice</dt>
            <dd>{ended ? choice?.name : <span className="flex items-center gap-1.5 text-muted"><Lock className="size-3.5" />Hidden on this receipt</span>}</dd>
          </div>
        </dl>
      </Card>

      <div className="mt-4 flex gap-3 rounded-xl bg-primary-soft p-4 text-sm text-primary-ink">
        <ShieldCheck className="size-5 shrink-0" />
        <p>Your receipt proves your vote was counted, but not whom you voted for. So nobody can pressure you into showing it.</p>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3 print:hidden">
        <Button variant="secondary" onClick={() => window.print()}><Printer className="size-4" />Print</Button>
        <Button variant="secondary" to={`/verify/${e.id}`}>Public verification page</Button>
        <Button to="/vote">Back to my elections</Button>
      </div>
      <p className="mt-4 text-center text-xs text-muted">Anyone can check this code at <Link to="/receipt" className="text-primary hover:underline">votechain.app/receipt</Link></p>
    </div>
  )
}
