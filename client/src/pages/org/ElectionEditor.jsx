import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Blocks, Check, CheckCircle2, FileUp, Loader2, Plus, Trash2, UserPlus } from 'lucide-react'
import { Avatar, Badge, Button, Card, Field, Input, Modal, PageHeader, Select, Textarea } from '../../components/ui'
import { useStore } from '../../store/AppStore'
import { cn, electionStatus, fmtDateTime, fmtNum } from '../../lib/utils'

const STEPS = ['Details', 'Candidates', 'Voters', 'Review']
const CATEGORIES = ['Student council', 'Department', 'Club', 'Hostel', 'Committee', 'Board resolution', 'Poll', 'Other']

const toLocal = (iso) => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16) }
const defaultStart = () => { const d = new Date(Date.now() + 86_400_000); d.setHours(9, 0, 0, 0); return d.toISOString() }
const defaultEnd = () => { const d = new Date(Date.now() + 86_400_000); d.setHours(17, 0, 0, 0); return d.toISOString() }
const blankCandidate = () => ({ id: 'c' + Math.random().toString(36).slice(2, 7), name: '', title: '', bio: '', manifesto: [] })

export default function ElectionEditor() {
  const { id } = useParams()
  const { user, electionById, saveElection } = useStore()
  const navigate = useNavigate()
  const existing = id && electionById(id)

  const [step, setStep] = useState(0)
  const [f, setF] = useState(() => existing
    ? { ...existing, startAt: toLocal(existing.startAt), endAt: toLocal(existing.endAt), candidates: existing.candidates.map((c) => ({ ...c, manifestoText: c.manifesto.join('\n') })) }
    : { title: '', description: '', category: 'Student council', startAt: toLocal(defaultStart()), endAt: toLocal(defaultEnd()), candidates: [blankCandidate(), blankCandidate()], eligible: 0 })
  const [voterText, setVoterText] = useState('')
  const [voterFile, setVoterFile] = useState(null)
  const [errors, setErrors] = useState({})
  const [deploying, setDeploying] = useState(null)

  if (existing && !['draft', 'scheduled'].includes(electionStatus(existing))) {
    return (
      <Card className="p-10 text-center">
        <h2 className="font-semibold">This election can't be edited</h2>
        <p className="mt-1 text-sm text-muted">Once voting starts, the details are locked on-chain.</p>
        <Button className="mt-5" to={`/org/elections/${id}`}>Back to election</Button>
      </Card>
    )
  }

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const setCand = (i, k, v) => setF({ ...f, candidates: f.candidates.map((c, j) => (j === i ? { ...c, [k]: v } : c)) })
  const emails = [...new Set(voterText.split(/[\s,;]+/).map((s) => s.trim().toLowerCase()).filter((s) => /^\S+@\S+\.\S+$/.test(s)))]
  const voterCount = emails.length + (voterFile?.count || 0) || f.eligible

  const validate = (s = step) => {
    const e = {}
    if (s === 0) {
      if (f.title.trim().length < 5) e.title = 'Give the election a clear title (5+ characters).'
      if (new Date(f.endAt) <= new Date(f.startAt)) e.endAt = 'The end time must be after the start time.'
      if (!existing && new Date(f.startAt) < new Date()) e.startAt = 'The start time must be in the future.'
    }
    if (s === 1) {
      const named = f.candidates.filter((c) => c.name.trim())
      if (named.length < 2) e.candidates = 'Add at least two candidates or options.'
    }
    if (s === 2 && voterCount < 1) e.voters = 'Add at least one eligible voter.'
    setErrors(e)
    return !Object.keys(e).length
  }

  const build = (state) => ({
    ...(existing || { id: 'el-' + Date.now().toString(36), orgId: user.orgId, tally: {}, turnoutSeries: [] }),
    title: f.title.trim(), description: f.description.trim(), category: f.category,
    startAt: new Date(f.startAt).toISOString(), endAt: new Date(f.endAt).toISOString(),
    candidates: f.candidates.filter((c) => c.name.trim()).map(({ manifestoText, ...c }) => ({ ...c, manifesto: (manifestoText || '').split('\n').map((s) => s.trim()).filter(Boolean) })),
    eligible: voterCount, state,
  })

  const saveDraft = () => { const e = build('draft'); saveElection(e); navigate(`/org/elections/${e.id}`) }

  const publish = () => {
    if (![0, 1, 2].every((s) => validate(s))) return
    const e = build('active')
    const stages = ['Hashing election details', 'Building voter list Merkle root', 'Sending createElection transaction', 'Waiting for block confirmation']
    let i = 0
    setDeploying({ stages, i })
    const t = setInterval(() => {
      i += 1
      setDeploying({ stages, i })
      if (i > stages.length) { clearInterval(t); saveElection(e); setTimeout(() => navigate(`/org/elections/${e.id}`), 700) }
    }, 800)
  }

  const onCsv = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const rows = String(reader.result).split(/\r?\n/).filter((r) => r.includes('@'))
      setVoterFile({ name: file.name, count: rows.length })
    }
    reader.readAsText(file)
  }

  return (
    <>
      <PageHeader
        back={<Link to={existing ? `/org/elections/${id}` : '/org/elections'} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" />Back</Link>}
        title={existing ? 'Edit election' : 'New election'}
        subtitle="Details become permanent once the election is deployed on-chain."
        actions={<Button variant="secondary" onClick={saveDraft} disabled={!f.title.trim()}>Save as draft</Button>}
      />

      <ol className="mb-6 grid grid-cols-4 gap-2">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => (i < step || validate()) && setStep(i)}
              className={cn('w-full border-t-2 pt-2 text-left text-sm font-medium', i <= step ? 'border-primary text-ink' : 'border-line text-muted')}
            >
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
            <Field label="Ballot type" hint="Ranked choice is planned for v2."><Select disabled><option>Single choice: one vote per voter</option></Select></Field>
            <Field label="Voting opens" error={errors.startAt}><Input type="datetime-local" value={f.startAt} onChange={set('startAt')} /></Field>
            <Field label="Voting closes" error={errors.endAt}><Input type="datetime-local" value={f.endAt} onChange={set('endAt')} /></Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            {errors.candidates && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{errors.candidates}</p>}
            {f.candidates.map((c, i) => (
              <div key={c.id} className="rounded-xl border border-line p-4">
                <div className="flex items-start gap-4">
                  <Avatar name={c.name || '?'} size={48} />
                  <div className="grid flex-1 gap-3 sm:grid-cols-2">
                    <Input value={c.name} onChange={(e) => setCand(i, 'name', e.target.value)} placeholder={`Candidate ${i + 1} name`} />
                    <Input value={c.title} onChange={(e) => setCand(i, 'title', e.target.value)} placeholder="Course, year or position" />
                    <Textarea value={c.bio} onChange={(e) => setCand(i, 'bio', e.target.value)} placeholder="Short bio" className="min-h-20 sm:col-span-1" />
                    <Textarea value={c.manifestoText || ''} onChange={(e) => setCand(i, 'manifestoText', e.target.value)} placeholder="Manifesto points, one per line" className="min-h-20" />
                  </div>
                  <button
                    type="button" disabled={f.candidates.length <= 2}
                    onClick={() => setF({ ...f, candidates: f.candidates.filter((_, j) => j !== i) })}
                    className="rounded-lg p-2 text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-30" aria-label="Remove candidate"
                  ><Trash2 className="size-4" /></button>
                </div>
              </div>
            ))}
            <Button variant="secondary" onClick={() => setF({ ...f, candidates: [...f.candidates, blankCandidate()] })}><Plus className="size-4" />Add candidate</Button>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="font-semibold">Upload a CSV</h3>
              <p className="mt-1 text-sm text-muted">Columns: name, email, member ID. We email each voter a private invite.</p>
              <label className="mt-4 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-line px-6 py-10 text-center hover:border-primary">
                <FileUp className="size-7 text-muted" />
                <span className="mt-3 text-sm font-medium">{voterFile ? voterFile.name : 'Choose a CSV file'}</span>
                <span className="mt-1 text-xs text-muted">{voterFile ? `${fmtNum(voterFile.count)} voters found` : 'Up to 10,000 rows'}</span>
                <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => onCsv(e.target.files?.[0])} />
              </label>
            </div>
            <div>
              <h3 className="font-semibold">Or paste emails</h3>
              <p className="mt-1 text-sm text-muted">Separate them with commas, spaces or new lines.</p>
              <Textarea value={voterText} onChange={(e) => setVoterText(e.target.value)} className="mt-4 min-h-40 font-mono text-xs" placeholder={'aarav@northfield.edu\ndiya@northfield.edu'} />
            </div>
            <div className={cn('flex items-center gap-3 rounded-lg px-4 py-3 text-sm lg:col-span-2', errors.voters ? 'bg-danger-soft text-danger' : 'bg-surface-2')}>
              <UserPlus className="size-4" />
              {errors.voters || <span><strong>{fmtNum(voterCount)}</strong> eligible voters{existing && !voterText && !voterFile ? ' (from the saved list)' : ''}</span>}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              {[['Opens', fmtDateTime(new Date(f.startAt).toISOString())], ['Closes', fmtDateTime(new Date(f.endAt).toISOString())], ['Eligible voters', fmtNum(voterCount)]].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-surface-2 px-4 py-3"><div className="text-xs text-muted">{k}</div><div className="mt-0.5 font-semibold">{v}</div></div>
              ))}
            </div>
            <div>
              <Badge>{f.category}</Badge>
              <h3 className="mt-2 text-xl font-semibold">{f.title || 'Untitled election'}</h3>
              <p className="mt-1 text-sm text-muted">{f.description || 'No description.'}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {f.candidates.filter((c) => c.name.trim()).map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-lg border border-line p-3">
                  <Avatar name={c.name} size={36} /><div><div className="font-medium">{c.name}</div><div className="text-xs text-muted">{c.title}</div></div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 rounded-xl border border-primary/30 bg-primary-soft p-4 text-sm text-primary-ink">
              <Blocks className="size-5 shrink-0" />
              <p>Publishing deploys this election to the VoteChain contract. The voting window, candidate list and voter list are fixed on-chain. VoteChain pays the gas.</p>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-between border-t border-line pt-5">
          <Button variant="secondary" onClick={() => setStep(step - 1)} disabled={step === 0}>Back</Button>
          {step < 3
            ? <Button onClick={() => validate() && setStep(step + 1)}>Continue</Button>
            : <Button onClick={publish}><Blocks className="size-4" />Publish to blockchain</Button>}
        </div>
      </Card>

      <Modal open={!!deploying} title="Deploying election" dismissible={false}>
        <ul className="space-y-3">
          {deploying?.stages.map((s, i) => (
            <li key={s} className="flex items-center gap-3 text-sm">
              {i < deploying.i ? <CheckCircle2 className="size-5 text-success" /> : i === deploying.i ? <Loader2 className="size-5 animate-spin text-primary" /> : <span className="size-5 rounded-full border-2 border-line" />}
              <span className={i > deploying.i ? 'text-muted' : ''}>{s}</span>
            </li>
          ))}
        </ul>
        {deploying && deploying.i > deploying.stages.length - 1 && (
          <p className="mt-5 flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2 text-sm text-success"><Check className="size-4" />Election created on-chain</p>
        )}
      </Modal>
    </>
  )
}
