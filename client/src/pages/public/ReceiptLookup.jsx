import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, FileSearch, XCircle } from 'lucide-react'
import { Button, Card, Hash, Input } from '../../components/ui'
import { findReceipt, useStore } from '../../store/AppStore'
import { fmtDateTime, fmtNum } from '../../lib/utils'
import { CHAIN } from '../../data/seed'

export default function ReceiptLookup() {
  const store = useStore()
  const [code, setCode] = useState('')
  const [result, setResult] = useState(undefined)
  const [busy, setBusy] = useState(false)

  const check = (e) => {
    e.preventDefault()
    setBusy(true)
    setTimeout(() => { setResult(findReceipt(store, code)); setBusy(false) }, 700)
  }
  const election = result && store.electionById(result.electionId)
  const sample = Object.values(store.myVotes)[0]?.receipt

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <span className="inline-flex rounded-xl bg-primary-soft p-3 text-primary"><FileSearch className="size-6" /></span>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">Check a vote receipt</h1>
      <p className="mt-2 text-muted">Enter the receipt code or transaction hash you got after voting. We'll confirm it's recorded on {CHAIN.name}. Your choice is never shown.</p>

      <form onSubmit={check} className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="VC-XXXX-XXXX or 0x…" className="h-12 font-mono" required />
        <Button type="submit" size="lg" disabled={busy}>{busy ? 'Checking chain…' : 'Verify'}</Button>
      </form>
      {sample && <p className="mt-2 text-xs text-muted">Try the demo receipt <button type="button" className="font-mono text-primary hover:underline" onClick={() => setCode(sample)}>{sample}</button></p>}

      {result === null && (
        <Card className="animate-fade-in mt-8 flex gap-3 border-danger/30 p-5">
          <XCircle className="size-5 shrink-0 text-danger" />
          <div>
            <div className="font-medium">No vote found for that code</div>
            <p className="mt-1 text-sm text-muted">Check for typos. Receipts look like VC-8F3A-21C9. If you're sure it's right, contact your election organizer.</p>
          </div>
        </Card>
      )}
      {result && (
        <Card className="animate-fade-in mt-8 border-success/40 p-6">
          <div className="flex items-center gap-2 font-semibold text-success"><CheckCircle2 className="size-5" />Vote found on-chain</div>
          <dl className="mt-5 space-y-3 text-sm">
            {[
              ['Election', <Link to={`/verify/${result.electionId}`} className="font-medium text-primary hover:underline">{election?.title}</Link>],
              ['Transaction', <Hash value={result.txHash} />],
              ['Block', `#${fmtNum(result.block)}`],
              ['Recorded', fmtDateTime(result.castAt)],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-4"><dt className="text-muted">{k}</dt><dd className="min-w-0 text-right">{v}</dd></div>
            ))}
          </dl>
        </Card>
      )}
    </div>
  )
}
