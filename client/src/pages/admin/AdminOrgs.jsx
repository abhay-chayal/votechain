import { useState } from 'react'
import { Async, Avatar, Button, Card, PageHeader, StatusBadge, Table, Tabs, Td } from '../../components/ui'
import { api } from '../../lib/api'
import { useApi } from '../../lib/useApi'
import { useToast } from '../../store/toast'
import { fmtDate, fmtNum } from '../../lib/utils'

export default function AdminOrgs() {
  const q = useApi('/admin/organizations')
  const [tab, setTab] = useState('all')
  const [busy, setBusy] = useState(null)
  const toast = useToast()

  const setStatus = async (org, status) => {
    setBusy(org.id)
    try {
      const { organization } = await api.patch(`/admin/organizations/${org.id}`, { status })
      q.setData((d) => ({ organizations: d.organizations.map((o) => (o.id === org.id ? { ...o, ...organization } : o)) }))
      toast(`${org.name} is now ${status === 'active' ? 'active' : status}`)
    } catch (err) { toast(err.message, 'error') } finally { setBusy(null) }
  }

  return (
    <>
      <PageHeader title="Organizations" subtitle="Approve new organizations and suspend abuse." />
      <Async q={q}>
        {({ organizations }) => {
          const count = (s) => organizations.filter((o) => o.status === s).length
          const list = tab === 'all' ? organizations : organizations.filter((o) => o.status === tab)
          return (
            <>
              <Tabs value={tab} onChange={setTab} tabs={[
                { value: 'all', label: 'All', count: organizations.length }, { value: 'pending', label: 'Pending', count: count('pending') },
                { value: 'active', label: 'Active', count: count('active') }, { value: 'suspended', label: 'Suspended', count: count('suspended') },
              ]} />
              <Card>
                <Table head={['Organization', 'Type', 'Members', 'Elections', 'Joined', 'Status', '']}>
                  {list.map((o) => (
                    <tr key={o.id}>
                      <Td><div className="flex items-center gap-3"><Avatar name={o.name} size={34} /><div className="min-w-0"><div className="font-medium">{o.name}</div><div className="max-w-xs truncate text-xs text-muted">{o.description || o.website || '—'}</div></div></div></Td>
                      <Td className="text-muted">{o.type}</Td>
                      <Td className="tabular-nums">{fmtNum(o.members)}</Td>
                      <Td className="tabular-nums">{o.elections}</Td>
                      <Td className="whitespace-nowrap text-muted">{fmtDate(o.createdAt)}</Td>
                      <Td><StatusBadge status={o.status} /></Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-2">
                          {o.status === 'pending' && <><Button size="sm" disabled={busy === o.id} onClick={() => setStatus(o, 'active')}>Approve</Button><Button size="sm" variant="ghost" disabled={busy === o.id} onClick={() => setStatus(o, 'suspended')}>Reject</Button></>}
                          {o.status === 'active' && <Button size="sm" variant="ghost" className="text-danger" disabled={busy === o.id} onClick={() => setStatus(o, 'suspended')}>Suspend</Button>}
                          {o.status === 'suspended' && <Button size="sm" variant="secondary" disabled={busy === o.id} onClick={() => setStatus(o, 'active')}>Reinstate</Button>}
                        </div>
                      </Td>
                    </tr>
                  ))}
                </Table>
                {!list.length && <p className="px-5 py-8 text-center text-sm text-muted">None.</p>}
              </Card>
            </>
          )
        }}
      </Async>
    </>
  )
}
