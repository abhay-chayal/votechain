import { Blocks, Database, Fuel, Mail, Server } from 'lucide-react'
import { Badge, Card, CardHeader, Hash, PageHeader, Progress, Table, Td } from '../../components/ui'
import { CHAIN, CONTRACT_ADDRESS } from '../../data/seed'
import { relTime, seededHex } from '../../lib/utils'

const services = [
  { icon: Server, name: 'REST API', detail: 'p95 latency 142 ms', status: 'Operational', tone: 'success' },
  { icon: Database, name: 'MongoDB Atlas', detail: 'M10 cluster · 38% storage', status: 'Operational', tone: 'success' },
  { icon: Blocks, name: `${CHAIN.name} RPC`, detail: 'Block 6,900,412 · 12 s behind head', status: 'Operational', tone: 'success' },
  { icon: Fuel, name: 'Vote relayer', detail: '0.42 ETH · 1,284 tx today', status: 'Low balance', tone: 'warning' },
  { icon: Mail, name: 'Email delivery', detail: '99.2% delivered (24 h)', status: 'Operational', tone: 'success' },
]

const failed = [
  { tx: '0x' + seededHex('fail-1'), reason: 'AlreadyVoted', at: new Date(Date.now() - 1_800_000).toISOString() },
  { tx: '0x' + seededHex('fail-2'), reason: 'ElectionNotActive', at: new Date(Date.now() - 7_200_000).toISOString() },
  { tx: '0x' + seededHex('fail-3'), reason: 'InvalidMerkleProof', at: new Date(Date.now() - 86_400_000).toISOString() },
]

export default function AdminHealth() {
  return (
    <>
      <PageHeader title="System health" subtitle="Live status of the services VoteChain depends on." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map(({ icon: Icon, name, detail, status, tone }) => (
          <Card key={name} className="p-5">
            <div className="flex items-center justify-between"><span className="rounded-lg bg-surface-2 p-2 text-muted"><Icon className="size-4" /></span><Badge tone={tone}>{status}</Badge></div>
            <div className="mt-4 font-semibold">{name}</div>
            <div className="text-sm text-muted">{detail}</div>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader title="Rejected vote transactions" subtitle="The contract reverted these. This is expected when someone tries to vote twice." />
          <Table head={['Transaction', 'Revert reason', 'When']}>
            {failed.map((f) => (
              <tr key={f.tx}><Td><Hash value={f.tx} /></Td><Td><code className="rounded bg-danger-soft px-1.5 py-0.5 text-xs text-danger">{f.reason}</code></Td><Td className="text-muted">{relTime(f.at)}</Td></tr>
            ))}
          </Table>
        </Card>
        <Card>
          <CardHeader title="Contract" />
          <dl className="divide-y divide-line text-sm">
            <div className="flex items-center justify-between px-5 py-3"><dt className="text-muted">Address</dt><dd><Hash value={CONTRACT_ADDRESS} kind="address" /></dd></div>
            <div className="flex items-center justify-between px-5 py-3"><dt className="text-muted">Version</dt><dd className="font-mono text-xs">VoteChain v1.0.0</dd></div>
            <div className="flex items-center justify-between px-5 py-3"><dt className="text-muted">Chain ID</dt><dd className="font-mono text-xs">{CHAIN.chainId}</dd></div>
          </dl>
          <div className="border-t border-line p-5">
            <div className="mb-1.5 flex justify-between text-sm"><span className="text-muted">Relayer balance</span><span className="font-medium">0.42 / 2.00 ETH</span></div>
            <Progress value={21} tone="bg-warning" />
          </div>
        </Card>
      </div>
    </>
  )
}
