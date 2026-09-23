import { Link } from 'react-router-dom'
import { History } from 'lucide-react'
import { Card, EmptyState, Hash, PageHeader, StatusBadge, Table, Td } from '../../components/ui'
import { useStore } from '../../store/AppStore'
import { electionStatus, fmtDateTime } from '../../lib/utils'

export default function VoteHistory() {
  const { myVotes, electionById, orgById } = useStore()
  const rows = Object.entries(myVotes)
    .map(([id, r]) => ({ e: electionById(id), r }))
    .filter((x) => x.e)
    .sort((a, b) => new Date(b.r.castAt) - new Date(a.r.castAt))

  return (
    <>
      <PageHeader title="Voting history" subtitle="Every election you took part in. Your choices are never shown here." />
      <Card>
        {rows.length ? (
          <Table head={['Election', 'Voted', 'Receipt', 'Transaction', 'Status']}>
            {rows.map(({ e, r }) => (
              <tr key={e.id}>
                <Td><Link to={`/vote/receipt/${e.id}`} className="font-medium hover:text-primary">{e.title}</Link><div className="text-xs text-muted">{orgById(e.orgId)?.name}</div></Td>
                <Td className="whitespace-nowrap text-muted">{fmtDateTime(r.castAt)}</Td>
                <Td className="font-mono text-xs">{r.receipt}</Td>
                <Td><Hash value={r.txHash} /></Td>
                <Td><StatusBadge status={electionStatus(e)} /></Td>
              </tr>
            ))}
          </Table>
        ) : <EmptyState icon={History} title="No votes yet" text="Elections you vote in will appear here with their receipts." />}
      </Card>
    </>
  )
}
