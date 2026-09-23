import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Building2, KeyRound, Mail, ShieldCheck, Vote } from 'lucide-react'
import { Button, Card, Field, Input } from '../../components/ui'
import { useStore } from '../../store/AppStore'
import { users } from '../../data/seed'
import { homeFor } from '../../layouts/PublicLayout'
import { cn } from '../../lib/utils'

const demos = [
  { role: 'voter', icon: Vote, title: 'Voter', text: 'Aarav Mehta, student' },
  { role: 'org_admin', icon: Building2, title: 'Organization admin', text: 'Dr. Anil Verma, Northfield' },
  { role: 'platform_admin', icon: ShieldCheck, title: 'Platform admin', text: 'Riya Kapoor, VoteChain' },
]

export default function Login() {
  const { loginAs } = useStore()
  const navigate = useNavigate()
  const { state } = useLocation()
  const [mode, setMode] = useState('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const go = (role) => {
    const u = loginAs(role)
    navigate(state?.from?.startsWith(homeFor(u.role)) ? state.from : homeFor(u.role), { replace: true })
  }

  const submit = (e) => {
    e.preventDefault()
    setError('')
    const match = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
    if (!match) return setError('No account with that email. Use one of the demo accounts on the right.')
    if (mode === 'otp' && !otpSent) { setOtpSent(true); return }
    if (mode === 'otp' && otp.length !== 6) return setError('Enter the 6-digit code from your email.')
    if (mode === 'password' && password.length < 6) return setError('Password must be at least 6 characters.')
    setBusy(true)
    setTimeout(() => go(match.role), 500)
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12 sm:py-16 lg:grid-cols-[1fr_380px]">
      <Card className="p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight">Sign in to VoteChain</h1>
        <p className="mt-1 text-muted">Voters, organizers and admins all sign in here.</p>

        <div className="mt-6 grid grid-cols-2 rounded-lg bg-surface-2 p-1 text-sm font-medium">
          {[['password', 'Password', KeyRound], ['otp', 'Email code', Mail]].map(([m, l, Icon]) => (
            <button key={m} type="button" onClick={() => { setMode(m); setError(''); setOtpSent(false) }}
              className={cn('flex items-center justify-center gap-2 rounded-md py-2', mode === m ? 'bg-surface shadow-sm' : 'text-muted')}>
              <Icon className="size-4" />{l}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Email">
            <Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@organization.com" />
          </Field>
          {mode === 'password' && (
            <Field label="Password">
              <Input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </Field>
          )}
          {mode === 'otp' && otpSent && (
            <Field label="6-digit code" hint={`We sent a code to ${email}. In this demo, any 6 digits work.`}>
              <Input inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} className="font-mono tracking-[0.4em]" placeholder="000000" />
            </Field>
          )}
          {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Signing in…' : mode === 'otp' && !otpSent ? 'Email me a code' : 'Sign in'}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          Running elections for your organization? <Link to="/register" className="font-medium text-primary hover:underline">Register it</Link>
        </p>
      </Card>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Demo accounts</h2>
        <p className="mt-1 text-sm text-muted">This prototype runs on sample data. Pick a role to explore.</p>
        <div className="mt-4 space-y-3">
          {demos.map(({ role, icon: Icon, title, text }) => (
            <button key={role} onClick={() => go(role)} className="flex w-full items-center gap-4 rounded-xl border border-line bg-surface p-4 text-left transition hover:border-primary hover:shadow-sm">
              <span className="rounded-lg bg-primary-soft p-2.5 text-primary"><Icon className="size-5" /></span>
              <span>
                <span className="block font-medium">{title}</span>
                <span className="block text-sm text-muted">{text}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
