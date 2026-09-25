import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Loader2, Lock, ShieldCheck, XCircle } from 'lucide-react'
import { Async, Avatar, Button, Card, Modal } from '../../components/ui'
import { api } from '../../lib/api'
import { useApi } from '../../lib/useApi'
import { cn, electionStatus } from '../../lib/utils'

const STAGES = ['Checking your eligibility', 'Creating your anonymous voter token', 'Submitting to the VoteChain contract', 'Waiting for block confirmation']

export default function Ballot() {
  const { id } = useParams()
  const q = useApi(`/voter/elections/${id}`)
  const navigate = useNavigate()
  const [choice, setChoice] = useState(null)
  const [review, setReview] = useState(false)
  const [stage, setStage] = useState(-1)
  const [error, setError] = useState('')

  const submit = async () => {
    setError('')
    setStage(0)
    // The request is one call; the stages reflect what the server does while it waits.
    const timers = [400, 900, 1600].map((ms, i) => setTimeout(() => setStage((s) => (s >= 0 ? Math.max(s, i + 1) : s)), ms))
    try {
      await api.post(`/voter/elections/${id}/vote`, { candidateId: choice })
      timers.forEach(clearTimeout)
      setStage(STAGES.length)
      setTimeout(() => navigate(`/vote/receipt/${id}`, { replace: true, state: { fresh: true } }), 600)
    } catch (err) {
      timers.forEach(clearTimeout)
      setStage(-1)
      setError(err.message)
      if (err.status === 409) q.reload()
    }
  }

  return (
    <Async q={q}>
      {({ election: e, receipt }) => {
        if (receipt && stage < 0) return <Navigate to={`/vote/receipt/${e.id}`} replace />
        if (electionStatus(e) !== 'live' && stage < 0) return <Navigate to={`/vote/elections/${e.id}`} replace />
        const picked = e.candidates.find((c) => c.id === choice)
        const busy = stage >= 0
        return (
          <div className="mx-auto max-w-3xl">
            <Link to={`/vote/elections/${e.id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" />Election details</Link>
            <h1 className="text-2xl font-bold tracking-tight">{e.title}</h1>
            <p className="mt-1 text-muted">Choose one candidate. You can't change your vote after you submit it.</p>

            <fieldset className="mt-6 space-y-3">
              <legend className="sr-only">Candidates</legend>
              {e.candidates.map((c) => (
                <label key={c.id} className={cn(
                  'flex cursor-pointer items-center gap-4 rounded-xl border-2 bg-surface p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary',
                  choice === c.id ? 'border-primary bg-primary-soft/40' : 'border-line hover:border-primary/40',
                )}>
                  <input type="radio" name="candidate" value={c.id} checked={choice === c.id} onChange={() => setChoice(c.id)} className="sr-only" />
                  <Avatar name={c.name} size={48} />
                  <div className="min-w-0 flex-1"><div className="font-semibold">{c.name}</div><div className="text-sm text-muted">{c.title}</div></div>
                  <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full border-2', choice === c.id ? 'border-primary bg-primary text-white' : 'border-line')}>
                    {choice === c.id && <CheckCircle2 className="size-4" />}
                  </span>
                </label>
              ))}
            </fieldset>

            <Card className="sticky bottom-4 mt-6 flex flex-col gap-3 p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-2 text-sm text-muted"><Lock className="size-4 shrink-0" />Your identity is never stored with your choice.</span>
              <Button size="lg" disabled={!choice} onClick={() => { setError(''); setReview(true) }}>Review vote</Button>
            </Card>

            <Modal
              open={review} onClose={() => !busy && setReview(false)} dismissible={!busy}
              title={busy ? 'Recording your vote' : 'Confirm your vote'}
              footer={!busy && <>
                <Button variant="secondary" onClick={() => setReview(false)}>Change</Button>
                <Button onClick={submit}><ShieldCheck className="size-4" />{error ? 'Try again' : 'Cast vote'}</Button>
              </>}
            >
              {!busy ? (
                <>
                  <p className="text-sm text-muted">You're voting for:</p>
                  <div className="mt-3 flex items-center gap-4 rounded-xl border border-line p-4">
                    <Avatar name={picked?.name} size={48} />
                    <div><div className="font-semibold">{picked?.name}</div><div className="text-sm text-muted">{picked?.title}</div></div>
                  </div>
                  <p className="mt-4 text-sm text-muted">Once submitted, your vote is written to the blockchain and <strong className="text-ink">can't be changed or withdrawn</strong>.</p>
                  {error && <p className="mt-4 flex gap-2 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger"><XCircle className="mt-0.5 size-4 shrink-0" />{error}</p>}
                </>
              ) : (
                <ul className="space-y-3">
                  {STAGES.map((s, i) => (
                    <li key={s} className="flex items-center gap-3 text-sm">
                      {i < stage ? <CheckCircle2 className="size-5 text-success" /> : i === stage ? <Loader2 className="size-5 animate-spin text-primary" /> : <span className="size-5 rounded-full border-2 border-line" />}
                      <span className={i > stage ? 'text-muted' : ''}>{s}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Modal>
          </div>
        )
      }}
    </Async>
  )
}
