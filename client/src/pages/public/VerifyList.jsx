import { useState } from 'react'
import { Search, ShieldCheck } from 'lucide-react'
import { Async, Card, Input } from '../../components/ui'
import { ElectionCard } from '../../components/election'
import { useApi } from '../../lib/useApi'
import { electionStatus } from '../../lib/utils'

const ORDER = ['live', 'closed', 'published', 'scheduled']

export default function VerifyList() {
  const q = useApi('/public/elections')
  const [text, setText] = useState('')

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-primary"><ShieldCheck className="size-4" />Public verification</span>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Verify any election</h1>
          <p className="mt-2 text-muted">Each election page checks its numbers directly against the blockchain from your browser, so you don't have to trust VoteChain's servers.</p>
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search elections or organizations" className="pl-9" />
        </div>
      </div>
      <div className="mt-8">
        <Async q={q}>
          {({ elections }) => {
            const list = elections
              .filter((e) => (e.title + e.org?.name).toLowerCase().includes(text.toLowerCase()))
              .sort((a, b) => ORDER.indexOf(electionStatus(a)) - ORDER.indexOf(electionStatus(b)))
            return list.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((e) => <ElectionCard key={e.id} election={e} org={e.org} to={`/verify/${e.id}`} />)}
              </div>
            ) : <Card className="p-10 text-center text-muted">{text ? `No elections match “${text}”.` : 'No public elections yet.'}</Card>
          }}
        </Async>
      </div>
    </div>
  )
}
