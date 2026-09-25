import { Link, useLocation, useParams } from 'react-router-dom'
import { CheckCircle2, Lock, Printer, ShieldCheck } from 'lucide-react'
import { Async, Button, Card, CopyButton, Hash } from '../../components/ui'
import { useApi } from '../../lib/useApi'
import { useChainInfo } from '../../store/chain'
import { fmtDateTime, fmtNum } from '../../lib/utils'

export default function Receipt() {
  const { id } = useParams()
  const { state } = useLocation()
  const chain = useChainInfo()
  const q = useApi(`/voter/receipts/${id}`)

  return (
    <Async q={q}>
      {({ receipt: r, election: e }) => {
        const rows = [
          ['Election', e.title],
          ['Organization', e.orgName],
          ['Recorded', fmtDateTime(r.castAt)],
          ['Network', chain.network || '—'],
          ['Contract', <Hash value={e.chain?.contract} kind="address" />],
          ['Transaction', <Hash value={r.txHash} />],
          ['Block', `#${fmtNum(r.block)}`],
          ['Your voter token', <Hash value={r.voterToken} kind="token" />],
        ]
        return (
          <div className="mx-auto max-w-2xl">
            <div className="text-center">
              <span className="inline-flex rounded-full bg-success-soft p-4 text-success"><CheckCircle2 className="size-8" /></span>
              <h1 className="mt-4 font-display text-[28px] font-semibold leading-tight tracking-[-0.01em]">{state?.fresh ? 'Your vote is recorded' : 'Vote receipt'}</h1>
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
                  <dd className="flex items-center gap-1.5 text-muted"><Lock className="size-3.5" />Not stored by VoteChain</dd>
                </div>
              </dl>
            </Card>

            <div className="mt-4 flex gap-3 rounded-lg bg-primary-soft p-4 text-sm text-primary-ink">
              <ShieldCheck className="size-5 shrink-0" />
              <p>Your receipt proves your vote was counted, but not whom you voted for. So nobody can pressure you into showing it.</p>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3 print:hidden">
              <Button variant="secondary" onClick={() => window.print()}><Printer className="size-4" />Print</Button>
              <Button variant="secondary" to={`/verify/${e.id}`}>Public verification page</Button>
              <Button to="/vote">Back to my elections</Button>
            </div>
            <p className="mt-4 text-center text-xs text-muted">Anyone can check this code on the <Link to={`/receipt?code=${r.receipt}`} className="text-primary hover:underline">receipt check page</Link>.</p>
          </div>
        )
      }}
    </Async>
  )
}
