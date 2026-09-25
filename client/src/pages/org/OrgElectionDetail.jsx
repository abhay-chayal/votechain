import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Bell, Download, ExternalLink, Lock, Pencil, Search, Square, Trash2, Trophy, Users, Vote } from 'lucide-react'
import {
  Async, Avatar, Badge, Button, Card, CardHeader, Countdown, ErrorText, Hash, Input, Modal, PageHeader, StatCard, StatusBadge, Table, Tabs, Td,
} from '../../components/ui'
import { ResultsBars, SealedResults, TurnoutChart } from '../../components/election'
import { api } from '../../lib/api'
import { useApi } from '../../lib/useApi'
import { useToast } from '../../store/toast'
import { electionStatus, fmtDateTime, fmtNum, relTime, turnout } from '../../lib/utils'

function Voters({ e, status }) {
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const voters = useApi(`/elections/${e.id}/voters?limit=200${search ? `&q=${encodeURIComponent(search)}` : ''}`)
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const ended = status === 'closed' || status === 'published'

  const remind = async () => {
    setBusy(true)
    try {
      const r = await api.post(`/elections/${e.id}/remind`)
      toast(`Reminder sent to ${r.total} voters who haven't voted yet`)
    } catch (err) { toast(err.message, 'error') } finally { setBusy(false) }
  }

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <form className="relative sm:w-72" onSubmit={(ev) => { ev.preventDefault(); setSearch(q.trim()) }}>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(ev) => { setQ(ev.target.value); if (!ev.target.value) setSearch('') }} placeholder="Search name, email or ID, then Enter" className="pl-9" />
        </form>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={remind} disabled={ended || status !== 'live' || busy}><Bell className="size-4" />Remind non-voters</Button>
          <Button variant="secondary" size="sm" onClick={() => api.download(`/elections/${e.id}/voters.csv`, `voters-${e.id}.csv`).catch((err) => toast(err.message, 'error'))}><Download className="size-4" />Export CSV</Button>
          {['draft', 'scheduled'].includes(status) && <Button size="sm" to={`/org/elections/${e.id}/edit`}>Add voters</Button>}
        </div>
      </div>
      {voters.data ? (
        <>
          <Table head={['Voter', 'Member ID', 'Status']}>
            {voters.data.voters.map((v) => (
              <tr key={v.id}>
                <Td><div className="flex items-center gap-3"><Avatar name={v.name || v.email} size={30} /><div className="min-w-0"><div className="font-medium">{v.name || '—'}</div><div className="truncate text-xs text-muted">{v.email}</div></div></div></Td>
                <Td className="font-mono text-xs">{v.memberId || '—'}</Td>
                <Td><StatusBadge status={v.status} /></Td>
              </tr>
            ))}
          </Table>
          {!voters.data.voters.length && <p className="px-5 py-8 text-center text-sm text-muted">No voters match.</p>}
          <p className="border-t border-line px-5 py-3 text-xs text-muted">
            Showing {voters.data.voters.length} of {fmtNum(voters.data.total)} · {fmtNum(voters.data.counts.voted || 0)} voted. You can see whether someone voted, never how they voted.
          </p>
        </>
      ) : <p className="px-5 py-10 text-center text-sm text-muted">{voters.error ? voters.error.message : 'Loading…'}</p>}
    </Card>
  )
}

function Audit({ id }) {
  const q = useApi(`/elections/${id}/audit`)
  return (
    <Card>
      {q.data ? (
        <Table head={['When', 'Event', 'By']}>
          {q.data.items.map((a, i) => (
            <tr key={i}><Td className="whitespace-nowrap text-muted">{fmtDateTime(a.at)}<div className="text-xs">{relTime(a.at)}</div></Td><Td>{a.text}</Td><Td className="text-muted">{a.actor}</Td></tr>
          ))}
        </Table>
      ) : <p className="px-5 py-10 text-center text-sm text-muted">Loading…</p>}
    </Card>
  )
}

export default function OrgElectionDetail() {
  const { id } = useParams()
  const q = useApi(`/elections/${id}`, { interval: 15_000 })
  const [tab, setTab] = useState('overview')
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const toast = useToast()
  const navigate = useNavigate()

  const act = async (fn, message) => {
    setBusy(true)
    setActionError('')
    try {
      await fn()
      setConfirm(null)
      if (message) toast(message)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Async q={q}>
      {({ election: e }) => {
        const status = electionStatus(e)
        const ended = status === 'closed' || status === 'published'
        return (
          <>
            <PageHeader
              back={<Link to="/org/elections" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" />Elections</Link>}
              title={<span className="flex flex-wrap items-center gap-3">{e.title}<StatusBadge status={status} /></span>}
              subtitle={`${e.category} · ${fmtDateTime(e.startAt)} – ${fmtDateTime(e.closedAt || e.endAt)}`}
              actions={<>
                {e.state !== 'draft' && <Button variant="secondary" to={`/verify/${e.id}`}><ExternalLink className="size-4" />Public page</Button>}
                {status === 'draft' && <Button variant="ghost" className="text-danger" onClick={() => setConfirm('delete')}><Trash2 className="size-4" />Delete</Button>}
                {['draft', 'scheduled'].includes(status) && <Button variant={status === 'draft' ? 'primary' : 'secondary'} to={`/org/elections/${e.id}/edit`}><Pencil className="size-4" />{status === 'draft' ? 'Continue setup' : 'Edit'}</Button>}
                {status === 'live' && <Button variant="danger" onClick={() => setConfirm('close')}><Square className="size-4" />Close early</Button>}
                {status === 'closed' && <Button onClick={() => setConfirm('publish')}><Trophy className="size-4" />Publish results</Button>}
              </>}
            />

            <Tabs value={tab} onChange={setTab} tabs={[
              { value: 'overview', label: 'Overview' }, { value: 'candidates', label: 'Candidates', count: e.candidates.length },
              { value: 'voters', label: 'Voters', count: e.eligible }, { value: 'results', label: 'Results' }, { value: 'audit', label: 'Audit log' },
            ]} />

            {tab === 'overview' && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <StatCard label="Votes cast" value={fmtNum(e.votesCast)} icon={Vote} hint={status === 'live' ? 'Refreshes every 15 seconds' : undefined} />
                  <StatCard label="Eligible voters" value={fmtNum(e.eligible)} icon={Users} tone="info" />
                  <StatCard label="Turnout" value={`${turnout(e)}%`} icon={Users} tone="success" />
                </div>
                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                  <Card>
                    <CardHeader title="Turnout over time" subtitle="Cumulative votes recorded on-chain" />
                    <div className="p-5"><TurnoutChart series={e.turnoutSeries} eligible={e.eligible} /></div>
                  </Card>
                  <div className="space-y-6">
                    {status === 'live' && <Card className="p-5"><Countdown to={e.endAt} label="Voting closes in" /></Card>}
                    {status === 'scheduled' && <Card className="p-5"><Countdown to={e.startAt} label="Voting opens in" /></Card>}
                    <Card>
                      <CardHeader title="On-chain" />
                      {e.chain ? (
                        <dl className="divide-y divide-line text-sm">
                          <div className="flex items-center justify-between gap-3 px-5 py-3"><dt className="text-muted">Contract</dt><dd className="min-w-0"><Hash value={e.chain.contract} kind="address" /></dd></div>
                          <div className="flex items-center justify-between gap-3 px-5 py-3"><dt className="text-muted">Created in</dt><dd className="min-w-0"><Hash value={e.chain.txHash} /></dd></div>
                          <div className="flex items-center justify-between gap-3 px-5 py-3"><dt className="text-muted">Details hash</dt><dd className="min-w-0"><Hash value={e.chain.detailsHash} kind="token" /></dd></div>
                          {e.chain.closeTxHash && <div className="flex items-center justify-between gap-3 px-5 py-3"><dt className="text-muted">Closed in</dt><dd className="min-w-0"><Hash value={e.chain.closeTxHash} /></dd></div>}
                        </dl>
                      ) : <p className="px-5 py-4 text-sm text-muted">Not on-chain yet. Publish the election to deploy it.</p>}
                    </Card>
                  </div>
                </div>
                {e.description && <Card className="p-5"><h3 className="font-semibold">About this election</h3><p className="mt-2 whitespace-pre-line text-sm text-muted">{e.description}</p></Card>}
              </div>
            )}

            {tab === 'candidates' && (
              <div className="grid gap-4 md:grid-cols-2">
                {e.candidates.map((c) => (
                  <Card key={c.id} className="p-5">
                    <div className="flex items-center gap-4"><Avatar name={c.name} size={52} /><div><div className="font-semibold">{c.name}</div><div className="text-sm text-muted">{c.title}</div></div></div>
                    {c.bio && <p className="mt-4 text-sm text-muted">{c.bio}</p>}
                    {!!c.manifesto.length && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{c.manifesto.map((m) => <li key={m}>{m}</li>)}</ul>}
                  </Card>
                ))}
              </div>
            )}

            {tab === 'voters' && <Voters e={e} status={status} />}

            {tab === 'results' && (
              <Card>
                <CardHeader title={ended ? 'Final results' : 'Results'} subtitle={ended ? `${fmtNum(e.votesCast)} votes · ${turnout(e)}% turnout` : undefined}
                  action={status === 'published' ? <Badge tone="primary">Published</Badge> : status === 'closed' ? <Badge tone="warning"><Lock className="size-3" />Not yet published</Badge> : null} />
                <div className="p-5">{ended && e.tally ? <ResultsBars election={e} /> : <SealedResults election={e} />}</div>
              </Card>
            )}

            {tab === 'audit' && <Audit id={e.id} />}

            <Modal
              open={!!confirm} onClose={() => { setConfirm(null); setActionError('') }} dismissible={!busy}
              title={{ close: 'Close voting now?', publish: 'Publish results?', delete: 'Delete this draft?' }[confirm]}
              footer={<>
                <Button variant="secondary" onClick={() => setConfirm(null)} disabled={busy}>Cancel</Button>
                {confirm === 'close' && <Button variant="danger" disabled={busy} onClick={() => act(async () => { const r = await api.post(`/elections/${e.id}/close`); q.setData(r); setTab('results') }, 'Voting closed on-chain')}>{busy ? 'Closing…' : 'Close voting'}</Button>}
                {confirm === 'publish' && <Button disabled={busy} onClick={() => act(async () => q.setData(await api.post(`/elections/${e.id}/publish-results`)), 'Results published. Voters are being notified.')}>{busy ? 'Publishing…' : 'Publish'}</Button>}
                {confirm === 'delete' && <Button variant="danger" disabled={busy} onClick={() => act(async () => { await api.del(`/elections/${e.id}`); navigate('/org/elections') }, 'Draft deleted')}>Delete</Button>}
              </>}
            >
              <p className="text-sm text-muted">
                {confirm === 'close' && `The contract will reject any further votes. ${fmtNum(e.eligible - e.votesCast)} eligible voters haven't voted yet. This can't be undone.`}
                {confirm === 'publish' && 'Results will appear on the public verification page, and every voter will get an email.'}
                {confirm === 'delete' && 'The draft and its voter list will be removed. Nothing has been written on-chain yet.'}
              </p>
              <div className="mt-3"><ErrorText>{actionError}</ErrorText></div>
            </Modal>
          </>
        )
      }}
    </Async>
  )
}
