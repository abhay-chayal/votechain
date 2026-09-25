import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Blocks, CheckCircle2, FileUp, Loader2, Plus, Trash2, UserPlus, XCircle } from 'lucide-react'
import { Avatar, Badge, Button, Card, ErrorText, Field, Input, Modal, PageHeader, PageLoader, ErrorState, Select, Textarea } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../store/auth'
import { cn, electionStatus, fmtDateTime, fmtNum } from '../../lib/utils'

const STEPS = ['Details', 'Candidates', 'Voters', 'Review']
const CATEGORIES = ['Student council', 'Department', 'Club', 'Hostel', 'Committee', 'Board resolution', 'Poll', 'Other']
const EMAIL = /[^\s,;<>"]+@[^\s,;<>"]+\.[^\s,;<>"]+/

const toLocal = (iso) => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16) }
const tomorrowAt = (h) => { const d = new Date(Date.now() + 86_400_000); d.setHours(h, 0, 0, 0); return d.toISOString() }
const blankCandidate = () => ({ id: 'new-' + Math.random().toString(36).slice(2, 7), name: '', title: '', bio: '', manifestoText: '' })

/** Reads "name,email,member id" rows (header optional) or a plain list of emails. */
export function parseVoters(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (!lines.length) return []
  const header = lines[0].toLowerCase()
  const hasHeader = header.includes('email') && !EMAIL.test(lines[0])
  const cols = hasHeader ? header.split(',').map((c) => c.trim().replace(/[^a-z]/g, '')) : null
  const out = new Map()
  for (const line of hasHeader ? lines.slice(1) : lines) {
    if (cols) {
      const cells = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
      const get = (...names) => cells[cols.findIndex((c) => names.includes(c))] || ''
      const email = get('email', 'emailaddress').toLowerCase()
      if (EMAIL.test(email)) out.set(email, { email, name: get('name', 'fullname'), memberId: get('memberid', 'id', 'rollno', 'rollnumber', 'employeeid') })
    } else {
      for (const m of line.matchAll(new RegExp(EMAIL, 'g'))) out.set(m[0].toLowerCase(), { email: m[0].toLowerCase() })
    }
  }
  return [...out.values()]
}

export default function ElectionEditor() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [existing, setExisting] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [step, setStep] = useState(0)
  const [f, setF] = useState({ title: '', description: '', category: 'Student council', startAt: toLocal(tomorrowAt(9)), endAt: toLocal(tomorrowAt(17)), candidates: [blankCandidate(), blankCandidate()] })
  const [voterText, setVoterText] = useState('')
  const [fileVoters, setFileVoters] = useState(null)
  const [errors, setErrors] = useState({})
  const [progress, setProgress] = useState(null)

  useEffect(() => {
    if (!id) return
    api.get(`/elections/${id}`).then(({ election: e }) => {
      setExisting(e)
      setF({ ...e, startAt: toLocal(e.startAt), endAt: toLocal(e.endAt), candidates: e.candidates.map((c) => ({ ...c, manifestoText: c.manifesto.join('\n') })) })
    }).catch(setLoadError)
  }, [id])

  if (id && loadError) return <ErrorState error={loadError} />
  if (id && !existing) return <PageLoader />
  const status = existing && electionStatus(existing)
  if (existing && !['draft', 'scheduled'].includes(status)) {
    return (
      <Card className="p-10 text-center">
        <h2 className="font-semibold">This election can't be edited</h2>
        <p className="mt-1 text-sm text-muted">Once voting starts, the details are locked on-chain.</p>
        <Button className="mt-5" to={`/org/elections/${id}`}>Back to election</Button>
      </Card>
    )
  }

  const isDraft = !existing || existing.state === 'draft'
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const setCand = (i, k, v) => setF({ ...f, candidates: f.candidates.map((c, j) => (j === i ? { ...c, [k]: v } : c)) })
  const newVoters = (() => {
    const m = new Map([...(fileVoters?.voters || []), ...parseVoters(voterText)].map((v) => [v.email, v]))
    return [...m.values()]
  })()
  const voterCount = (existing?.eligible || 0) + newVoters.length
  const namedCandidates = f.candidates.filter((c) => c.name.trim())

  const validate = (s = step) => {
    const e = {}
    if (s === 0) {
      if (f.title.trim().length < 5) e.title = 'Give the election a clear title (5+ characters).'
      if (new Date(f.endAt) <= new Date(f.startAt)) e.endAt = 'The end time must be after the start time.'
      else if (new Date(f.endAt) <= new Date()) e.endAt = 'The end time must be in the future.'
    }
    if (s === 1 && namedCandidates.length < 2) e.candidates = 'Add at least two candidates or options.'
    if (s === 2 && voterCount < 1) e.voters = 'Add at least one eligible voter.'
    setErrors(e)
    return !Object.keys(e).length
  }

  const body = () => ({
    title: f.title.trim(), description: f.description.trim(), category: f.category,
    startAt: new Date(f.startAt).toISOString(), endAt: new Date(f.endAt).toISOString(),
    candidates: namedCandidates.map((c) => ({
      ...(c.id && !c.id.startsWith('new-') ? { id: c.id } : {}),
      name: c.name.trim(), title: c.title?.trim() || '', bio: c.bio?.trim() || '',
      manifesto: (c.manifestoText || '').split('\n').map((s) => s.trim()).filter(Boolean),
    })),
  })

  // Runs the save steps one by one so the organizer can see exactly what happens.
  const run = async (publish) => {
    if (publish) {
      const bad = [0, 1, 2].find((s) => !validate(s))
      if (bad !== undefined) { setStep(bad); return }
    }
    if (!publish && f.title.trim().length < 5) { setStep(0); return validate(0) }
    const stages = [
      existing ? 'Saving changes' : 'Saving election details',
      ...(newVoters.length ? [`Adding ${fmtNum(newVoters.length)} voters`] : []),
      ...(publish ? ['Sending createElection transaction', 'Waiting for block confirmation'] : []),
      ...(!isDraft ? ['Updating the election on-chain'] : []),
    ]
    let i = 0
    const next = () => setProgress((p) => ({ ...p, i: ++i }))
    setProgress({ stages, i: 0 })
    try {
      let e = existing
        ? (await api.put(`/elections/${existing.id}`, body())).election
        : (await api.post('/elections', body())).election
      next()
      if (newVoters.length) {
        const res = await api.post(`/elections/${e.id}/voters`, { voters: newVoters })
        if (res.rejected?.length) setProgress((p) => ({ ...p, note: `${res.rejected.length} emails were skipped because they are outside your organization's allowed domain.` }))
        next()
      }
      if (publish) {
        const t = setTimeout(next, 600)
        e = (await api.post(`/elections/${e.id}/publish`)).election
        clearTimeout(t)
        i = stages.length - 1
        next()
      } else if (!isDraft) next()
      let hasNote = false
      setProgress((p) => { hasNote = !!p.note; return { ...p, done: true } })
      setTimeout(() => navigate(`/org/elections/${e.id}`), hasNote ? 3500 : 900)
    } catch (err) {
      setProgress((p) => ({ ...p, error: err.message, failedAt: i }))
      if (!existing && err.status !== 400) {
        // The draft was saved even if publishing failed; send the organizer to it.
        setProgress((p) => ({ ...p, savedDraft: true }))
      }
    }
  }

  const onCsv = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setFileVoters({ name: file.name, voters: parseVoters(String(reader.result)) })
    reader.readAsText(file)
  }

  return (
    <>
      <PageHeader
        back={<Link to={existing ? `/org/elections/${id}` : '/org/elections'} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" />Back</Link>}
        title={existing ? 'Edit election' : 'New election'}
        subtitle={isDraft ? 'Details become permanent once the election is published on-chain.' : 'Voting hasn\'t started yet, so changes are still allowed. They are written to the contract.'}
        actions={isDraft && <Button variant="secondary" onClick={() => run(false)}>Save as draft</Button>}
      />

      {user.org?.status === 'pending' && (
        <p className="mb-6 rounded-lg bg-warning-soft px-4 py-3 text-sm text-warning">Your organization is awaiting approval. You can save drafts now and publish once it's approved.</p>
      )}

      <ol className="mb-6 grid grid-cols-4 gap-2">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button type="button" onClick={() => (i < step || validate()) && setStep(i)}
              className={cn('w-full border-t-2 pt-2 text-left text-sm font-medium', i <= step ? 'border-primary text-ink' : 'border-line text-muted')}>
              <span className="text-xs text-muted">Step {i + 1}</span><br />{s}
            </button>
          </li>
        ))}
      </ol>

      <Card className="p-5 sm:p-7">
        {step === 0 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Election title" error={errors.title} className="sm:col-span-2"><Input value={f.title} onChange={set('title')} placeholder="e.g. Student Council President 2026–27" /></Field>
            <Field label="Description" hint="Shown to voters on the ballot page." className="sm:col-span-2"><Textarea value={f.description} onChange={set('description')} placeholder="Who is eligible, what the role involves…" /></Field>
            <Field label="Category"><Select value={f.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
            <Field label="Ballot type" hint="Ranked choice is planned for a later version."><Select disabled><option>Single choice: one vote per voter</option></Select></Field>
            <Field label="Voting opens" hint="A time in the past means voting opens as soon as you publish."><Input type="datetime-local" value={f.startAt} onChange={set('startAt')} /></Field>
            <Field label="Voting closes" error={errors.endAt}><Input type="datetime-local" value={f.endAt} onChange={set('endAt')} /></Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <ErrorText>{errors.candidates}</ErrorText>
            {f.candidates.map((c, i) => (
              <div key={c.id} className="rounded-xl border border-line p-4">
                <div className="flex items-start gap-4">
                  <Avatar name={c.name || '?'} size={48} className="hidden sm:inline-flex" />
                  <div className="grid flex-1 gap-3 sm:grid-cols-2">
                    <Input value={c.name} onChange={(e) => setCand(i, 'name', e.target.value)} placeholder={`Candidate ${i + 1} name`} aria-label={`Candidate ${i + 1} name`} />
                    <Input value={c.title} onChange={(e) => setCand(i, 'title', e.target.value)} placeholder="Course, year or position" />
                    <Textarea value={c.bio} onChange={(e) => setCand(i, 'bio', e.target.value)} placeholder="Short bio" className="min-h-20" />
                    <Textarea value={c.manifestoText || ''} onChange={(e) => setCand(i, 'manifestoText', e.target.value)} placeholder="Manifesto points, one per line" className="min-h-20" />
                  </div>
                  <button type="button" disabled={f.candidates.length <= 2} onClick={() => setF({ ...f, candidates: f.candidates.filter((_, j) => j !== i) })}
                    className="rounded-lg p-2 text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-30" aria-label="Remove candidate"><Trash2 className="size-4" /></button>
                </div>
              </div>
            ))}
            <Button variant="secondary" onClick={() => setF({ ...f, candidates: [...f.candidates, blankCandidate()] })} disabled={f.candidates.length >= 50}><Plus className="size-4" />Add candidate</Button>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="font-semibold">Upload a CSV</h3>
              <p className="mt-1 text-sm text-muted">Columns: <code className="font-mono text-xs">name, email, member id</code>. Each voter gets an email invite when you publish.</p>
              <label className="mt-4 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-line px-6 py-10 text-center hover:border-primary">
                <FileUp className="size-7 text-muted" />
                <span className="mt-3 text-sm font-medium">{fileVoters ? fileVoters.name : 'Choose a CSV file'}</span>
                <span className="mt-1 text-xs text-muted">{fileVoters ? `${fmtNum(fileVoters.voters.length)} voters found` : 'Up to 10,000 rows'}</span>
                <input type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={(e) => onCsv(e.target.files?.[0])} />
              </label>
            </div>
            <div>
              <h3 className="font-semibold">Or paste emails</h3>
              <p className="mt-1 text-sm text-muted">Separate them with commas, spaces or new lines.</p>
              <Textarea value={voterText} onChange={(e) => setVoterText(e.target.value)} className="mt-4 min-h-40 font-mono text-xs" placeholder={'aarav@college.edu\ndiya@college.edu'} />
            </div>
            <div className={cn('flex items-center gap-3 rounded-lg px-4 py-3 text-sm lg:col-span-2', errors.voters ? 'bg-danger-soft text-danger' : 'bg-surface-2')}>
              <UserPlus className="size-4 shrink-0" />
              {errors.voters || (
                <span>
                  <strong>{fmtNum(voterCount)}</strong> eligible voters
                  {existing?.eligible ? ` (${fmtNum(existing.eligible)} already on the list${newVoters.length ? `, ${fmtNum(newVoters.length)} new` : ''})` : ''}
                  {user.org?.allowedDomain && <span className="text-muted"> · only @{user.org.allowedDomain.replace(/^@/, '')} addresses are accepted</span>}
                </span>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              {[['Opens', new Date(f.startAt) < new Date() ? 'As soon as you publish' : fmtDateTime(new Date(f.startAt).toISOString())], ['Closes', fmtDateTime(new Date(f.endAt).toISOString())], ['Eligible voters', fmtNum(voterCount)]].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-surface-2 px-4 py-3"><div className="text-xs text-muted">{k}</div><div className="mt-0.5 font-semibold">{v}</div></div>
              ))}
            </div>
            <div>
              <Badge>{f.category}</Badge>
              <h3 className="mt-2 text-xl font-semibold">{f.title || 'Untitled election'}</h3>
              <p className="mt-1 text-sm text-muted">{f.description || 'No description.'}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {namedCandidates.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-lg border border-line p-3">
                  <Avatar name={c.name} size={36} /><div><div className="font-medium">{c.name}</div><div className="text-xs text-muted">{c.title}</div></div>
                </div>
              ))}
            </div>
            {isDraft && (
              <div className="flex gap-3 rounded-xl border border-primary/30 bg-primary-soft p-4 text-sm text-primary-ink">
                <Blocks className="size-5 shrink-0" />
                <p>Publishing writes this election to the VoteChain contract and emails every voter. The voting window, candidates and voter list can be changed only until voting opens. VoteChain pays the gas.</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex justify-between border-t border-line pt-5">
          <Button variant="secondary" onClick={() => setStep(step - 1)} disabled={step === 0}>Back</Button>
          {step < 3
            ? <Button onClick={() => validate() && setStep(step + 1)}>Continue</Button>
            : isDraft
              ? <Button onClick={() => run(true)} disabled={user.org?.status !== 'active'}><Blocks className="size-4" />Publish to blockchain</Button>
              : <Button onClick={() => run(false)}>Save changes</Button>}
        </div>
      </Card>

      <Modal open={!!progress} title={progress?.error ? 'Something went wrong' : 'Saving election'} dismissible={!!progress?.error} onClose={() => setProgress(null)}
        footer={progress?.error && (progress.savedDraft
          ? <Button onClick={() => navigate('/org/elections')}>Go to my elections</Button>
          : <Button variant="secondary" onClick={() => setProgress(null)}>Close</Button>)}>
        <ul className="space-y-3">
          {progress?.stages.map((s, i) => (
            <li key={s} className="flex items-center gap-3 text-sm">
              {progress.error && i === progress.failedAt ? <XCircle className="size-5 text-danger" />
                : i < progress.i || progress.done ? <CheckCircle2 className="size-5 text-success" />
                  : i === progress.i ? <Loader2 className="size-5 animate-spin text-primary" />
                    : <span className="size-5 rounded-full border-2 border-line" />}
              <span className={i > progress.i && !progress.done ? 'text-muted' : ''}>{s}</span>
            </li>
          ))}
        </ul>
        {progress?.note && <p className="mt-4 text-sm text-warning">{progress.note}</p>}
        {progress?.error && <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{progress.error}</p>}
        {progress?.done && <p className="mt-4 rounded-lg bg-success-soft px-3 py-2 text-sm text-success">Done</p>}
      </Modal>
    </>
  )
}
