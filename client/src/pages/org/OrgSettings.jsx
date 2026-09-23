import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Avatar, Badge, Button, Card, CardHeader, Field, Input, PageHeader, Select, Textarea } from '../../components/ui'
import { useStore } from '../../store/AppStore'

export default function OrgSettings() {
  const { user, orgById } = useStore()
  const org = orgById(user.orgId)
  const [saved, setSaved] = useState(false)
  const save = (e) => { e.preventDefault(); setSaved(true); setTimeout(() => setSaved(false), 2000) }

  return (
    <>
      <PageHeader title="Organization" subtitle="Profile, admins and voting defaults." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader title="Profile" />
          <form onSubmit={save} className="grid gap-5 p-5 sm:grid-cols-2">
            <div className="flex items-center gap-4 sm:col-span-2">
              <Avatar name={org.name} size={64} />
              <div><Button variant="secondary" size="sm" type="button">Upload logo</Button><p className="mt-1 text-xs text-muted">PNG or SVG, 512×512 px</p></div>
            </div>
            <Field label="Name" className="sm:col-span-2"><Input defaultValue={org.name} /></Field>
            <Field label="Type"><Select defaultValue={org.type}>{['University', 'College', 'Company', 'Housing society', 'NGO', 'Club', 'Startup', 'Other'].map((t) => <option key={t}>{t}</option>)}</Select></Field>
            <Field label="Website"><Input defaultValue={org.website} /></Field>
            <Field label="Description" className="sm:col-span-2"><Textarea defaultValue={org.description} /></Field>
            <Field label="Allowed email domain" hint="Only invitees with this domain can register as voters."><Input defaultValue={org.website ? '@' + org.website : ''} /></Field>
            <Field label="Default voter sign-in"><Select><option>Email + one-time code</option><option>Email + password</option></Select></Field>
            <div className="flex items-center justify-end gap-3 sm:col-span-2">
              {saved && <span className="text-sm text-success">Saved</span>}
              <Button type="submit">Save changes</Button>
            </div>
          </form>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Admins" action={<Button size="sm" variant="secondary"><Plus className="size-4" />Invite</Button>} />
            <ul className="divide-y divide-line">
              {org.admins.map((a, i) => (
                <li key={a} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={a} size={34} />
                  <div className="flex-1 text-sm font-medium">{a}</div>
                  <Badge tone={i === 0 ? 'primary' : 'neutral'}>{i === 0 ? 'Owner' : 'Admin'}</Badge>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold">Plan</h3>
            <p className="mt-1 text-sm text-muted">Pilot: unlimited elections, up to 5,000 voters per election. Gas is paid by VoteChain.</p>
            <Badge tone="success" className="mt-3">Active</Badge>
          </Card>
        </div>
      </div>
    </>
  )
}
