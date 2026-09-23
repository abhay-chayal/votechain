import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Card, Input, PageHeader, StatusBadge, Table, Td } from '../../components/ui'
import { useStore } from '../../store/AppStore'
import { electionStatus, fmtDateTime, fmtNum, totalVotes, turnout } from '../../lib/utils'

export default function AdminElections() {
  const { elections, orgById } = useStore()
  const [q, setQ] = useState('')
  const list = elections.filter((e) => (e.title + orgById(e.orgId)?.name).toLowerCase().includes(q.toLowerCase()))

  return (
    <>
      <PageHeader title="Elections" subtitle="Every election across all organizations." />
      <Card>
        <div className="border-b border-line p-4">
          <div className="relative sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title or organization" className="pl-9" />
          </div>
        </div>
        <Table head={['Election', 'Organization', 'Window', 'Votes', 'Turnout', 'Status']}>
          {list.map((e) => (
            <tr key={e.id}>
              <Td>{e.state === 'draft' ? <span className="font-medium">{e.title}</span> : <Link to={`/verify/${e.id}`} className="font-medium hover:text-primary">{e.title}</Link>}</Td>
              <Td className="text-muted">{orgById(e.orgId)?.name}</Td>
              <Td className="whitespace-nowrap text-xs text-muted">{fmtDateTime(e.startAt)}<br />{fmtDateTime(e.endAt)}</Td>
              <Td className="tabular-nums">{fmtNum(totalVotes(e))}</Td>
              <Td className="tabular-nums">{turnout(e)}%</Td>
              <Td><StatusBadge status={electionStatus(e)} /></Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  )
}
