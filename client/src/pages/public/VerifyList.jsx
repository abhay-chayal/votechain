import { useState } from 'react'
import { Search, ShieldCheck } from 'lucide-react'
import { Card, Input } from '../../components/ui'
import { ElectionCard } from '../../components/election'
import { useStore } from '../../store/AppStore'
import { electionStatus } from '../../lib/utils'

export default function VerifyList() {
  const { elections, orgById } = useStore()
  const [q, setQ] = useState('')
  const list = elections
    .filter((e) => e.state !== 'draft')
    .filter((e) => (e.title + orgById(e.orgId)?.name).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => ['live', 'closed', 'published', 'scheduled'].indexOf(electionStatus(a)) - ['live', 'closed', 'published', 'scheduled'].indexOf(electionStatus(b)))

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-primary"><ShieldCheck className="size-4" />Public verification</span>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Verify any election</h1>
          <p className="mt-2 text-muted">These pages read directly from the blockchain, so what you see doesn't depend on trusting VoteChain's servers.</p>
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search elections or organizations" className="pl-9" />
        </div>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((e) => <ElectionCard key={e.id} election={e} org={orgById(e.orgId)} to={`/verify/${e.id}`} />)}
      </div>
      {!list.length && <Card className="mt-8 p-10 text-center text-muted">No elections match “{q}”.</Card>}
    </div>
  )
}
