import { useState } from 'react'
import { Async, Avatar, Badge, Button, Card, CardHeader, ErrorText, Field, Input, PageHeader, Select, StatusBadge, Textarea } from '../../components/ui'
import { api } from '../../lib/api'
import { useApi } from '../../lib/useApi'
import { useAuth } from '../../store/auth'
import { useToast } from '../../store/toast'

const TYPES = ['University', 'College', 'Company', 'Housing society', 'NGO', 'Club', 'Startup', 'Other']

function ProfileForm({ org, onSaved }) {
  const [f, setF] = useState({ name: org.name, type: org.type, website: org.website, description: org.description, allowedDomain: org.allowedDomain })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      onSaved((await api.put('/org', f)).org)
      toast('Organization saved')
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <form onSubmit={save} className="grid gap-5 p-5 sm:grid-cols-2">
      <div className="flex items-center gap-4 sm:col-span-2">
        <Avatar name={f.name} size={64} />
        <div><div className="font-semibold">{f.name}</div><StatusBadge status={org.status} /></div>
      </div>
      <Field label="Name" className="sm:col-span-2"><Input value={f.name} onChange={set('name')} required minLength={3} /></Field>
      <Field label="Type"><Select value={f.type} onChange={set('type')}>{TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
      <Field label="Website"><Input value={f.website} onChange={set('website')} placeholder="example.org" /></Field>
      <Field label="Description" className="sm:col-span-2"><Textarea value={f.description} onChange={set('description')} /></Field>
      <Field label="Allowed email domain" hint="If set, only voters with this email domain can be invited." className="sm:col-span-2"><Input value={f.allowedDomain} onChange={set('allowedDomain')} placeholder="college.edu" /></Field>
      <div className="flex items-center justify-end gap-3 sm:col-span-2">
        <ErrorText>{error}</ErrorText>
        <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button>
      </div>
    </form>
  )
}

export default function OrgSettings() {
  const q = useApi('/org')
  const { refreshUser } = useAuth()

  return (
    <>
      <PageHeader title="Organization" subtitle="Profile, admins and voting rules." />
      <Async q={q}>
        {({ org }) => (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <Card>
              <CardHeader title="Profile" />
              <ProfileForm org={org} onSaved={(o) => { q.setData({ org: o }); refreshUser() }} />
            </Card>
            <div className="space-y-6">
              <Card>
                <CardHeader title="Admins" />
                <ul className="divide-y divide-line">
                  {org.admins.map((a, i) => (
                    <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                      <Avatar name={a.name} size={34} />
                      <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{a.name}</div><div className="truncate text-xs text-muted">{a.email}</div></div>
                      <Badge tone={i === 0 ? 'primary' : 'neutral'}>{i === 0 ? 'Owner' : 'Admin'}</Badge>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="p-5">
                <h3 className="font-semibold">Gas and fees</h3>
                <p className="mt-1 text-sm text-muted">VoteChain's relayer pays the blockchain fees for creating elections and recording votes. Voters never need a wallet.</p>
              </Card>
            </div>
          </div>
        )}
      </Async>
    </>
  )
}
