import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Bell, Download, ExternalLink, Lock, Pencil, Search, Send, Square, Trophy, Users, Vote } from 'lucide-react'
import {
  Avatar, Badge, Button, Card, CardHeader, Countdown, Hash, Input, Modal, PageHeader, StatCard, StatusBadge, Table, Tabs, Td,
} from '../../components/ui'
import { ResultsBars, SealedResults, TurnoutChart } from '../../components/election'
import { useStore } from '../../store/AppStore'
import { CONTRACT_ADDRESS, voterRoster } from '../../data/seed'
import { electionStatus, fmtDateTime, fmtNum, relTime, seededHex, totalVotes, turnout } from '../../lib/utils'
import NotFound from '../public/NotFound'

export default function OrgElectionDetail() {
  const { id } = useParams()
  const { electionById, closeElection, publishResults, user } = useStore()
  const e = electionById(id)
  const [tab, setTab] = useState('overview')
  const [confirm, setConfirm] = useState(null)
  const [q, setQ] = useState('')
  const [toast, setToast] = useState('')
  if (!e || e.orgId !== user.orgId) return <NotFound />

  const status = electionStatus(e)
  const ended = status === 'closed' || status === 'published'
  const votes = totalVotes(e)
  const flash = (t) => { setToast(t); setTimeout(() => setToast(''), 2500) }

  const roster = voterRoster.filter((v) => (v.name + v.email + v.memberId).toLowerCase().includes(q.toLowerCase()))

  const audit = [
    [e.startAt, 'Voting opened (block 6,881,204)', 'Contract'],
    [new Date(new Date(e.startAt).getTime() - 3_600_000 * 20).toISOString(), `${fmtNum(e.eligible)} voters added, Merkle root committed`, 'Dr. Anil Verma'],
    [new Date(new Date(e.startAt).getTime() - 3_600_000 * 26).toISOString(), 'Election created on-chain', 'Dr. Anil Verma'],
    ...(ended ? [[e.endAt, 'Voting closed', 'Contract']] : []),
    ...(status === 'published' ? [[e.endAt, 'Results published', 'Dr. Anil Verma']] : []),
  ].sort((a, b) => new Date(b[0]) - new Date(a[0]))

  return (
    <>
      <PageHeader
        back={<Link to="/org/elections" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" />Elections</Link>}
        title={<span className="flex flex-wrap items-center gap-3">{e.title}<StatusBadge status={status} /></span>}
        subtitle={`${e.category} · ${fmtDateTime(e.startAt)} – ${fmtDateTime(e.endAt)}`}
        actions={<>
          {e.state !== 'draft' && <Button variant="secondary" to={`/verify/${e.id}`}><ExternalLink className="size-4" />Public page</Button>}
          {['draft', 'scheduled'].includes(status) && <Button variant="secondary" to={`/org/elections/${e.id}/edit`}><Pencil className="size-4" />Edit</Button>}
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
            <StatCard label="Votes cast" value={fmtNum(votes)} icon={Vote} hint={status === 'live' ? 'Updates with each block' : undefined} />
            <StatCard label="Eligible voters" value={fmtNum(e.eligible)} icon={Users} tone="info" />
            <StatCard label="Turnout" value={`${turnout(e)}%`} icon={Users} tone="success" />
          </div>
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <Card>
              <CardHeader title="Turnout over time" subtitle="Cumulative votes recorded on-chain" />
              <div className="p-5"><TurnoutChart series={e.turnoutSeries.length ? [...e.turnoutSeries.slice(0, -1), votes] : []} eligible={e.eligible} /></div>
            </Card>
            <div className="space-y-6">
              {status === 'live' && <Card className="p-5"><Countdown to={e.endAt} label="Voting closes in" /></Card>}
              {status === 'scheduled' && <Card className="p-5"><Countdown to={e.startAt} label="Voting opens in" /></Card>}
              <Card>
                <CardHeader title="On-chain" />
                <dl className="divide-y divide-line text-sm">
                  <div className="flex items-center justify-between px-5 py-3"><dt className="text-muted">Contract</dt><dd><Hash value={CONTRACT_ADDRESS} kind="address" /></dd></div>
                  <div className="flex items-center justify-between px-5 py-3"><dt className="text-muted">Details hash</dt><dd><Hash value={'0x' + seededHex(e.id + '-details')} kind="token" /></dd></div>
                  <div className="flex items-center justify-between px-5 py-3"><dt className="text-muted">Gas paid</dt><dd className="font-mono text-xs">{e.state === 'draft' ? '—' : `${(votes * 0.000041 + 0.0021).toFixed(4)} ETH`}</dd></div>
                </dl>
              </Card>
            </div>
          </div>
          {e.description && <Card className="p-5"><h3 className="font-semibold">About this election</h3><p className="mt-2 text-sm text-muted">{e.description}</p></Card>}
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

      {tab === 'voters' && (
        <Card>
          <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="Search voters" className="pl-9" />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => flash('Reminder sent to voters who have not voted yet')} disabled={ended}><Bell className="size-4" />Remind non-voters</Button>
              <Button variant="secondary" size="sm" onClick={() => flash('Voter list exported')}><Download className="size-4" />Export</Button>
              <Button size="sm" to={`/org/elections/${e.id}/edit`} disabled={!['draft', 'scheduled'].includes(status)}><Send className="size-4" />Invite</Button>
            </div>
          </div>
          <Table head={['Voter', 'Member ID', 'Status']}>
            {roster.map((v) => (
              <tr key={v.id}>
                <Td><div className="flex items-center gap-3"><Avatar name={v.name} size={30} /><div><div className="font-medium">{v.name}</div><div className="text-xs text-muted">{v.email}</div></div></div></Td>
                <Td className="font-mono text-xs">{v.memberId}</Td>
                <Td><StatusBadge status={v.status} /></Td>
              </tr>
            ))}
          </Table>
          <p className="border-t border-line px-5 py-3 text-xs text-muted">Showing {roster.length} of {fmtNum(e.eligible)} voters. You can see whether someone voted, never how they voted.</p>
        </Card>
      )}

      {tab === 'results' && (
        <Card>
          <CardHeader title={ended ? 'Final results' : 'Results'} subtitle={ended ? `${fmtNum(votes)} votes · ${turnout(e)}% turnout` : undefined}
            action={status === 'published' ? <Badge tone="primary">Published</Badge> : status === 'closed' ? <Badge tone="warning"><Lock className="size-3" />Visible to admins only</Badge> : null} />
          <div className="p-5">{ended ? <ResultsBars election={e} /> : <SealedResults election={e} />}</div>
        </Card>
      )}

      {tab === 'audit' && (
        <Card>
          <Table head={['When', 'Event', 'By']}>
            {audit.map(([at, text, by], i) => (
              <tr key={i}><Td className="whitespace-nowrap text-muted">{fmtDateTime(at)}<div className="text-xs">{relTime(at)}</div></Td><Td>{text}</Td><Td className="text-muted">{by}</Td></tr>
            ))}
          </Table>
        </Card>
      )}

      <Modal
        open={!!confirm} onClose={() => setConfirm(null)}
        title={confirm === 'close' ? 'Close voting now?' : 'Publish results?'}
        footer={<>
          <Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button>
          {confirm === 'close'
            ? <Button variant="danger" onClick={() => { closeElection(e.id); setConfirm(null); setTab('results') }}>Close voting</Button>
            : <Button onClick={() => { publishResults(e.id); setConfirm(null); flash('Results published. Voters have been notified.') }}>Publish</Button>}
        </>}
      >
        <p className="text-sm text-muted">
          {confirm === 'close'
            ? `The contract will reject any further votes. ${fmtNum(e.eligible - votes)} eligible voters haven't voted yet. This can't be undone.`
            : 'Results will appear on the public verification page, and every voter will get an email.'}
        </p>
      </Modal>

      {toast && <div className="animate-fade-in fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-ink px-4 py-2.5 text-sm text-bg shadow-lg">{toast}</div>}
    </>
  )
}
