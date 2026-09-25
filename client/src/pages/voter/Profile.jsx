import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { Avatar, Button, Card, CardHeader, ErrorText, Field, Input, PageHeader } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../store/auth'
import { useToast } from '../../store/toast'

function Toggle({ label, hint, on, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div><div className="text-sm font-medium">{label}</div><div className="text-xs text-muted">{hint}</div></div>
      <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-primary' : 'bg-line'}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${on ? 'left-5.5' : 'left-0.5'}`} />
      </button>
    </div>
  )
}

export default function Profile() {
  const { user, setUser, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [pw, setPw] = useState({ current: '', password: '' })
  const [pwError, setPwError] = useState('')

  const setPref = async (k, v) => {
    try {
      const { user: u } = await api.put('/auth/me', { prefs: { [k]: v } })
      setUser(u)
    } catch (err) { toast(err.message, 'error') }
  }

  const savePassword = async (e) => {
    e.preventDefault()
    setPwError('')
    try {
      await api.put('/auth/me/password', pw)
      setPw({ current: '', password: '' })
      toast('Password saved. You can now sign in with it too.')
    } catch (err) { setPwError(err.message) }
  }

  const signOutEverywhere = async () => {
    await api.post('/auth/logout-all').catch(() => {})
    await logout()
    navigate('/')
  }

  return (
    <>
      <PageHeader title="Profile" />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Personal details" subtitle="Managed by your organization. Contact your election organizer to change them." />
            <div className="grid gap-5 p-5 sm:grid-cols-2">
              <div className="flex items-center gap-4 sm:col-span-2"><Avatar name={user.name} size={60} /><div><div className="font-semibold">{user.name}</div><div className="text-sm text-muted">{user.email}</div></div></div>
              <Field label="Full name"><Input value={user.name} readOnly /></Field>
              <Field label="Member ID"><Input value={user.memberId || '—'} readOnly className="font-mono" /></Field>
            </div>
          </Card>
          <Card>
            <CardHeader title="Email notifications" />
            <div className="divide-y divide-line">
              <Toggle label="New election opens" hint="When you're invited to vote" on={user.prefs?.notifyOpen ?? true} onChange={(v) => setPref('notifyOpen', v)} />
              <Toggle label="Reminder before closing" hint="If you haven't voted yet" on={user.prefs?.notifyReminder ?? true} onChange={(v) => setPref('notifyReminder', v)} />
              <Toggle label="Results published" hint="With a link to the verification page" on={user.prefs?.notifyResults ?? false} onChange={(v) => setPref('notifyResults', v)} />
            </div>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Organizations" />
            <ul className="divide-y divide-line">
              {(user.orgs || []).map((o) => (
                <li key={o.id} className="flex items-center gap-3 px-5 py-3"><Avatar name={o.name} size={34} /><div className="min-w-0"><div className="truncate text-sm font-medium">{o.name}</div><div className="text-xs text-muted">{o.type}</div></div></li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Password" subtitle="Optional. You can always sign in with an email code." />
            <form onSubmit={savePassword} className="space-y-3 p-5">
              <Input type="password" placeholder="Current password (if you have one)" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
              <Input type="password" placeholder="New password (8+ characters)" autoComplete="new-password" minLength={8} required value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} />
              <ErrorText>{pwError}</ErrorText>
              <Button type="submit" size="sm">Save password</Button>
            </form>
          </Card>
          <Button variant="secondary" className="w-full" onClick={signOutEverywhere}><LogOut className="size-4" />Sign out on all devices</Button>
        </div>
      </div>
    </>
  )
}
