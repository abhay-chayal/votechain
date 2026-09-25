import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Async, Card, Input, PageHeader, StatusBadge, Table, Td } from '../../components/ui'
import { useApi } from '../../lib/useApi'
import { electionStatus, fmtDateTime, fmtNum, turnout } from '../../lib/utils'

export default function AdminElections() {
  const q = useApi('/admin/elections')
  const [text, setText] = useState('')

  return (
    <>
      <PageHeader title="Elections" subtitle="Every election across all organizations." />
      <Card>
        <div className="border-b border-line p-4">
          <div className="relative sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search by title or organization" className="pl-9" />
          </div>
        </div>
        <Async q={q}>
          {({ elections }) => {
            const list = elections.filter((e) => (e.title + e.orgName).toLowerCase().includes(text.toLowerCase()))
            return (
              <Table head={['Election', 'Organization', 'Window', 'Votes', 'Turnout', 'Status']}>
                {list.map((e) => (
                  <tr key={e.id}>
                    <Td>{e.state === 'draft' ? <span className="font-medium">{e.title}</span> : <Link to={`/verify/${e.id}`} className="font-medium hover:text-primary">{e.title}</Link>}</Td>
                    <Td className="text-muted">{e.orgName}</Td>
                    <Td className="whitespace-nowrap text-xs text-muted">{fmtDateTime(e.startAt)}<br />{fmtDateTime(e.closedAt || e.endAt)}</Td>
                    <Td className="tabular-nums">{fmtNum(e.votesCast)}</Td>
                    <Td className="tabular-nums">{turnout(e)}%</Td>
                    <Td><StatusBadge status={electionStatus(e)} /></Td>
                  </tr>
                ))}
              </Table>
            )
          }}
        </Async>
      </Card>
    </>
  )
}
