import { useState } from 'react'
import { ClipboardList, PlusCircle } from 'lucide-react'
import { Async, Button, Card, EmptyState, PageHeader, Tabs } from '../../components/ui'
import { ElectionCard } from '../../components/election'
import { useApi } from '../../lib/useApi'
import { electionStatus } from '../../lib/utils'

const GROUPS = { all: null, live: ['live'], upcoming: ['scheduled'], draft: ['draft'], past: ['closed', 'published'] }

export default function OrgElections() {
  const q = useApi('/elections')
  const [tab, setTab] = useState('all')

  return (
    <>
      <PageHeader title="Elections" subtitle="Everything your organization has run or planned." actions={<Button to="/org/elections/new"><PlusCircle className="size-4" />New election</Button>} />
      <Async q={q}>
        {({ elections }) => {
          const pick = (k) => (GROUPS[k] ? elections.filter((e) => GROUPS[k].includes(electionStatus(e))) : elections)
          const list = pick(tab)
          return (
            <>
              <Tabs
                value={tab} onChange={setTab}
                tabs={[['all', 'All'], ['live', 'Live'], ['upcoming', 'Scheduled'], ['draft', 'Drafts'], ['past', 'Past']].map(([value, label]) => ({ value, label, count: pick(value).length }))}
              />
              {list.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((e) => <ElectionCard key={e.id} election={e} to={`/org/elections/${e.id}`} />)}
                </div>
              ) : (
                <Card><EmptyState icon={ClipboardList} title="No elections here" text="Elections you create will show up in these tabs." action={<Button to="/org/elections/new">Create one</Button>} /></Card>
              )}
            </>
          )
        }}
      </Async>
    </>
  )
}
