import { Link } from 'react-router-dom'
import { History } from 'lucide-react'
import { Async, Card, EmptyState, Hash, PageHeader, StatusBadge, Table, Td } from '../../components/ui'
import { useApi } from '../../lib/useApi'
import { electionStatus, fmtDateTime } from '../../lib/utils'

export default function VoteHistory() {
  const q = useApi('/voter/votes')
  return (
    <>
      <PageHeader title="Voting history" subtitle="Every election you took part in. Your choices are never stored." />
      <Async q={q}>
        {({ votes }) => (
          <Card>
            {votes.length ? (
              <Table head={['Election', 'Voted', 'Receipt', 'Transaction', 'Status']}>
                {votes.map((v) => (
                  <tr key={v.txHash}>
                    <Td><Link to={`/vote/receipt/${v.election.id}`} className="font-medium hover:text-primary">{v.election.title}</Link><div className="text-xs text-muted">{v.election.orgName}</div></Td>
                    <Td className="whitespace-nowrap text-muted">{fmtDateTime(v.castAt)}</Td>
                    <Td className="font-mono text-xs">{v.receipt}</Td>
                    <Td><Hash value={v.txHash} /></Td>
                    <Td><StatusBadge status={electionStatus(v.election)} /></Td>
                  </tr>
                ))}
              </Table>
            ) : <EmptyState icon={History} title="No votes yet" text="Elections you vote in will appear here with their receipts." />}
          </Card>
        )}
      </Async>
    </>
  )
}
