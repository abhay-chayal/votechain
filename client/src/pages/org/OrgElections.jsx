import { useState } from 'react'
import { ClipboardList, PlusCircle } from 'lucide-react'
import { Button, Card, EmptyState, PageHeader, Tabs } from '../../components/ui'
import { ElectionCard } from '../../components/election'
import { useStore } from '../../store/AppStore'
import { electionStatus } from '../../lib/utils'

const GROUPS = { all: null, live: ['live'], upcoming: ['scheduled'], draft: ['draft'], past: ['closed', 'published'] }

export default function OrgElections() {
  const { user, elections } = useStore()
  const [tab, setTab] = useState('all')
  const mine = elections.filter((e) => e.orgId === user.orgId)
  const count = (k) => (GROUPS[k] ? mine.filter((e) => GROUPS[k].includes(electionStatus(e))).length : mine.length)
  const list = GROUPS[tab] ? mine.filter((e) => GROUPS[tab].includes(electionStatus(e))) : mine

  return (
    <>
      <PageHeader title="Elections" subtitle="Everything your organization has run or planned." actions={<Button to="/org/elections/new"><PlusCircle className="size-4" />New election</Button>} />
      <Tabs
        value={tab} onChange={setTab}
        tabs={[['all', 'All'], ['live', 'Live'], ['upcoming', 'Scheduled'], ['draft', 'Drafts'], ['past', 'Past']].map(([value, label]) => ({ value, label, count: count(value) }))}
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
}
