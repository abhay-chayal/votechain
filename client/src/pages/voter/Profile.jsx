import { useState } from 'react'
import { Laptop, Smartphone } from 'lucide-react'
import { Avatar, Badge, Button, Card, CardHeader, Field, Input, PageHeader } from '../../components/ui'
import { useStore } from '../../store/AppStore'

function Toggle({ label, hint, defaultOn }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div><div className="text-sm font-medium">{label}</div><div className="text-xs text-muted">{hint}</div></div>
      <button role="switch" aria-checked={on} onClick={() => setOn(!on)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-primary' : 'bg-line'}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${on ? 'left-5.5' : 'left-0.5'}`} />
      </button>
    </div>
  )
}

export default function Profile() {
  const { user, orgById, resetDemo } = useStore()
  return (
    <>
      <PageHeader title="Profile" />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Personal details" subtitle="Managed by your organization. Contact your admin to change them." />
            <div className="grid gap-5 p-5 sm:grid-cols-2">
              <div className="flex items-center gap-4 sm:col-span-2"><Avatar name={user.name} size={60} /><div><div className="font-semibold">{user.name}</div><div className="text-sm text-muted">{user.email}</div></div></div>
              <Field label="Full name"><Input value={user.name} readOnly /></Field>
              <Field label="Member ID"><Input value={user.memberId} readOnly className="font-mono" /></Field>
            </div>
          </Card>
          <Card>
            <CardHeader title="Notifications" />
            <div className="divide-y divide-line">
              <Toggle label="New election opens" hint="Email when you're invited to vote" defaultOn />
              <Toggle label="Reminder before closing" hint="24 hours before voting ends, if you haven't voted" defaultOn />
              <Toggle label="Results published" hint="Email with a link to the verification page" defaultOn={false} />
            </div>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Organizations" />
            <ul className="divide-y divide-line">
              {user.orgIds.map((id) => { const o = orgById(id); return o && (
                <li key={id} className="flex items-center gap-3 px-5 py-3"><Avatar name={o.name} size={34} /><div className="min-w-0"><div className="truncate text-sm font-medium">{o.name}</div><div className="text-xs text-muted">{o.type}</div></div></li>
              ) })}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Active sessions" />
            <ul className="divide-y divide-line text-sm">
              <li className="flex items-center gap-3 px-5 py-3"><Laptop className="size-4 text-muted" /><span className="flex-1">Chrome on Windows · Pune</span><Badge tone="success">This device</Badge></li>
              <li className="flex items-center gap-3 px-5 py-3"><Smartphone className="size-4 text-muted" /><span className="flex-1">Safari on iPhone · 2 days ago</span><button className="text-xs text-danger hover:underline">Sign out</button></li>
            </ul>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold">Demo data</h3>
            <p className="mt-1 text-sm text-muted">Restore the sample elections and votes to their starting state.</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={resetDemo}>Reset demo</Button>
          </Card>
        </div>
      </div>
    </>
  )
}
