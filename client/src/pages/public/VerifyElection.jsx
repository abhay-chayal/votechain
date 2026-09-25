import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, FileSearch, Loader2, XCircle } from 'lucide-react'
import { Async, Badge, Card, CardHeader, Countdown, Hash, StatusBadge, Table, Td } from '../../components/ui'
import { ResultsBars, SealedResults } from '../../components/election'
import { useApi } from '../../lib/useApi'
import { useChainInfo } from '../../store/chain'
import { electionStatus, fmtDateTime, fmtNum, relTime, turnout } from '../../lib/utils'

function IntegrityChecks({ election }) {
  const chain = useChainInfo()
  const [state, setState] = useState({ loading: true })
  useEffect(() => {
    if (!chain.contract) return
    if (!chain.rpcUrl) return setState({ unavailable: true })
    let alive = true
    setState({ loading: true })
    import('../../lib/chain').then((m) => m.verifyElection(election, chain))
      .then((checks) => alive && setState({ checks }))
      .catch((err) => alive && setState({ error: err.message }))
    return () => { alive = false }
  }, [election, chain.contract, chain.rpcUrl])

  return (
    <Card>
      <CardHeader title="Integrity checks" subtitle="Run in your browser, straight against the blockchain" />
      <div className="p-5 text-sm">
        {state.loading && <p className="flex items-center gap-2 text-muted"><Loader2 className="size-4 animate-spin" />Reading the contract…</p>}
        {state.unavailable && <p className="text-muted">No public RPC endpoint is configured, so the browser can't check the chain directly.</p>}
        {state.error && <p className="text-danger">Couldn't reach the blockchain: {state.error}</p>}
        {state.checks && (
          <ul className="space-y-3">
            {state.checks.map((c) => (
              <li key={c.label} className="flex gap-2.5">
                {c.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-danger" />}
                <span className={c.ok ? '' : 'font-medium text-danger'}>{c.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}

export default function VerifyElection() {
  const { id } = useParams()
  const q = useApi(`/public/elections/${id}`, { interval: 30_000 })
  const ledger = useApi(`/public/elections/${id}/ledger`, { interval: 30_000 })
  const chain = useChainInfo()

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link to="/verify" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" />All elections</Link>
      <Async q={q}>
        {({ election: e }) => {
          const status = electionStatus(e)
          const ended = status === 'closed' || status === 'published'
          const facts = [
            ['Network', chain.network || '—'],
            ['Contract', <Hash value={e.chain?.contract} kind="address" />],
            ['On-chain election ID', <span className="font-mono text-xs">{e.chain?.electionId?.slice(0, 10)}…</span>],
            ['Created in', <Hash value={e.chain?.txHash} />],
            ['Details hash', <Hash value={e.chain?.detailsHash} kind="token" />],
            ['Voter list root', <Hash value={e.chain?.voterRoot} kind="token" />],
            ['Voting window', `${fmtDateTime(e.startAt)} – ${fmtDateTime(e.closedAt || e.endAt)}`],
          ]
          return (
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><StatusBadge status={status} /><Badge>{e.category}</Badge></div>
                  <h1 className="mt-3 font-display text-[34px] font-semibold leading-tight tracking-[-0.01em]">{e.title}</h1>
                  <p className="mt-1 text-muted">{e.org?.name}</p>
                </div>
                {status === 'live' && <Countdown to={e.endAt} label="Voting closes in" />}
                {status === 'scheduled' && <Countdown to={e.startAt} label="Voting opens in" />}
              </div>

              <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
                <div className="space-y-6">
                  <Card>
                    <CardHeader
                      title={ended ? 'Final results' : 'Results'}
                      subtitle={ended ? `${fmtNum(e.votesCast)} votes · ${turnout(e)}% turnout` : `${fmtNum(e.votesCast)} of ${fmtNum(e.eligible)} voters have voted (${turnout(e)}%)`}
                      action={ended && e.tally && <Badge tone="success"><CheckCircle2 className="size-3.5" />From the contract</Badge>}
                    />
                    <div className="p-5">{ended && e.tally ? <ResultsBars election={e} /> : <SealedResults election={e} />}</div>
                  </Card>

                  <Card>
                    <CardHeader title="Vote transactions" subtitle="The latest votes recorded by the contract. Voters appear only as anonymous tokens." />
                    {ledger.data?.items.length ? (
                      <Table head={['Transaction', 'Voter token', 'Block', 'Time']}>
                        {ledger.data.items.map((t) => (
                          <tr key={t.txHash}>
                            <Td><Hash value={t.txHash} /></Td>
                            <Td><Hash value={t.tokenHash} kind="token" /></Td>
                            <Td className="font-mono text-xs">{fmtNum(t.block)}</Td>
                            <Td className="whitespace-nowrap text-muted">{relTime(t.at)}</Td>
                          </tr>
                        ))}
                      </Table>
                    ) : <p className="px-5 py-10 text-center text-sm text-muted">{ledger.loading ? 'Loading…' : 'No votes yet.'}</p>}
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card>
                    <CardHeader title="On-chain record" />
                    <dl className="divide-y divide-line text-sm">
                      {facts.map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between gap-3 px-5 py-3">
                          <dt className="shrink-0 text-muted">{k}</dt><dd className="min-w-0 text-right">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </Card>
                  <IntegrityChecks election={e} />
                  <Link to="/receipt" className="flex items-center gap-3 rounded-lg border border-line bg-surface p-4 text-sm hover:border-primary">
                    <FileSearch className="size-5 text-primary" />
                    <span><span className="block font-medium">Voted in this election?</span><span className="text-muted">Check that your receipt is on-chain</span></span>
                  </Link>
                </div>
              </div>
            </>
          )
        }}
      </Async>
    </div>
  )
}
