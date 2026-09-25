import { Blocks, Database, Fuel, Mail, Server } from 'lucide-react'
import { Async, Badge, Card, CardHeader, Hash, PageHeader, Table, Td } from '../../components/ui'
import { useApi } from '../../lib/useApi'
import { fmtNum, relTime } from '../../lib/utils'

export default function AdminHealth() {
  const q = useApi('/admin/health', { interval: 15_000 })
  return (
    <>
      <PageHeader title="System health" subtitle="Live status of the services VoteChain depends on. Refreshes every 15 seconds." />
      <Async q={q}>
        {({ api, db, chain, mail, failed }) => {
          const services = [
            { icon: Server, name: 'REST API', detail: `Up ${Math.round(api.uptimeSec / 60)} min · Node ${api.node}`, ok: api.ok },
            { icon: Database, name: 'MongoDB', detail: db.ok ? `Ping ${db.latencyMs} ms` : 'Not connected', ok: db.ok },
            { icon: Blocks, name: chain.network || 'Blockchain RPC', detail: chain.ok ? `Block ${fmtNum(chain.block)} · chain ID ${chain.chainId}` : chain.error || 'Unreachable', ok: chain.ok },
            { icon: Fuel, name: 'Vote relayer', detail: chain.ok ? `${chain.balanceEth.toFixed(4)} ETH` : '—', ok: chain.ok && chain.balanceEth >= 0.05, warn: chain.ok && chain.balanceEth < 0.05 },
            { icon: Mail, name: 'Email delivery', detail: mail.note, ok: mail.ok, warn: !mail.ok },
          ]
          return (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {services.map(({ icon: Icon, name, detail, ok, warn }) => (
                  <Card key={name} className="p-5">
                    <div className="flex items-center justify-between">
                      <span className="rounded-lg bg-surface-2 p-2 text-muted"><Icon className="size-4" /></span>
                      <Badge tone={ok ? 'success' : warn ? 'warning' : 'danger'}>{ok ? 'Operational' : warn ? 'Needs attention' : 'Down'}</Badge>
                    </div>
                    <div className="mt-4 font-semibold">{name}</div>
                    <div className="break-words text-sm text-muted">{detail}</div>
                  </Card>
                ))}
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
                <Card>
                  <CardHeader title="Rejected transactions" subtitle="The contract refused these. A few are expected, e.g. someone trying to vote twice." />
                  {failed.length ? (
                    <Table head={['Action', 'Reason', 'When']}>
                      {failed.map((f, i) => (
                        <tr key={i}>
                          <Td className="font-mono text-xs">{f.action}</Td>
                          <Td><code className="rounded bg-danger-soft px-1.5 py-0.5 text-xs text-danger">{f.reason}</code></Td>
                          <Td className="whitespace-nowrap text-muted">{relTime(f.at)}</Td>
                        </tr>
                      ))}
                    </Table>
                  ) : <p className="px-5 py-8 text-center text-sm text-muted">None.</p>}
                </Card>
                <Card>
                  <CardHeader title="Contract" />
                  <dl className="divide-y divide-line text-sm">
                    <div className="flex items-center justify-between gap-3 px-5 py-3"><dt className="text-muted">Address</dt><dd className="min-w-0"><Hash value={chain.contract} kind="address" /></dd></div>
                    <div className="flex items-center justify-between gap-3 px-5 py-3"><dt className="text-muted">Relayer</dt><dd className="min-w-0"><Hash value={chain.relayer} kind="address" /></dd></div>
                    <div className="flex items-center justify-between gap-3 px-5 py-3"><dt className="text-muted">Chain ID</dt><dd className="font-mono text-xs">{chain.chainId ?? '—'}</dd></div>
                  </dl>
                </Card>
              </div>
            </>
          )
        }}
      </Async>
    </>
  )
}
