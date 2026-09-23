import { useState } from 'react'
import { Avatar, Button, Card, PageHeader, StatusBadge, Table, Tabs, Td } from '../../components/ui'
import { useStore } from '../../store/AppStore'
import { fmtDate, fmtNum } from '../../lib/utils'

export default function AdminOrgs() {
  const { organizations, elections, setOrgStatus } = useStore()
  const [tab, setTab] = useState('all')
  const list = tab === 'all' ? organizations : organizations.filter((o) => o.status === tab)
  const count = (s) => organizations.filter((o) => o.status === s).length

  return (
    <>
      <PageHeader title="Organizations" subtitle="Approve new organizations and suspend abuse." />
      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'all', label: 'All', count: organizations.length }, { value: 'pending', label: 'Pending', count: count('pending') },
        { value: 'active', label: 'Active', count: count('active') }, { value: 'suspended', label: 'Suspended', count: count('suspended') },
      ]} />
      <Card>
        <Table head={['Organization', 'Type', 'Members', 'Elections', 'Joined', 'Status', '']}>
          {list.map((o) => (
            <tr key={o.id}>
              <Td><div className="flex items-center gap-3"><Avatar name={o.name} size={34} /><div className="min-w-0"><div className="font-medium">{o.name}</div><div className="max-w-xs truncate text-xs text-muted">{o.description}</div></div></div></Td>
              <Td className="text-muted">{o.type}</Td>
              <Td className="tabular-nums">{fmtNum(o.members)}</Td>
              <Td className="tabular-nums">{elections.filter((e) => e.orgId === o.id).length}</Td>
              <Td className="whitespace-nowrap text-muted">{fmtDate(o.createdAt)}</Td>
              <Td><StatusBadge status={o.status} /></Td>
              <Td className="text-right">
                <div className="flex justify-end gap-2">
                  {o.status === 'pending' && <><Button size="sm" onClick={() => setOrgStatus(o.id, 'active')}>Approve</Button><Button size="sm" variant="ghost" onClick={() => setOrgStatus(o.id, 'suspended')}>Reject</Button></>}
                  {o.status === 'active' && <Button size="sm" variant="ghost" className="text-danger" onClick={() => setOrgStatus(o.id, 'suspended')}>Suspend</Button>}
                  {o.status === 'suspended' && <Button size="sm" variant="secondary" onClick={() => setOrgStatus(o.id, 'active')}>Reinstate</Button>}
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  )
}
