import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Building2, KeyRound, Mail, ShieldCheck, Vote } from 'lucide-react'
import { Button, Card, ErrorText, Field, Input } from '../../components/ui'
import { useAuth } from '../../store/auth'
import { homeFor } from '../../layouts/PublicLayout'
import { cn } from '../../lib/utils'

// Demo accounts created by the seed script. Set VITE_SHOW_DEMO_ACCOUNTS=false to hide them.
const SHOW_DEMO = import.meta.env.VITE_SHOW_DEMO_ACCOUNTS !== 'false'
const DEMO_PASSWORD = 'demo1234'
const demos = [
  { email: 'aarav.mehta@northfield.edu', icon: Vote, title: 'Voter', text: 'Aarav Mehta, student' },
  { email: 'anil.verma@northfield.edu', icon: Building2, title: 'Organization admin', text: 'Dr. Anil Verma, Northfield' },
  // The demo platform admin only exists in local development.
  ...(import.meta.env.DEV ? [{ email: 'admin@votechain.app', icon: ShieldCheck, title: 'Platform admin', text: 'Riya Kapoor, VoteChain' }] : []),
]

export default function Login() {
  const { user, login, requestOtp, verifyOtp } = useAuth()
  const navigate = useNavigate()
  const { state } = useLocation()
  const [mode, setMode] = useState('otp')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [devCode, setDevCode] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={homeFor(user.role)} replace />

  const done = (u) => navigate(state?.from?.startsWith(homeFor(u.role)) ? state.from : homeFor(u.role), { replace: true })

  const run = async (fn) => {
    setError('')
    setBusy(true)
    try { await fn() } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const submit = (e) => {
    e.preventDefault()
    run(async () => {
      if (mode === 'password') return done(await login(email, password))
      if (!otpSent) {
        const r = await requestOtp(email)
        setOtpSent(true)
        setDevCode(r.devCode || '')
        return
      }
      done(await verifyOtp(email, otp))
    })
  }

  return (
    <div className={cn('mx-auto grid gap-8 px-4 py-12 sm:py-16', SHOW_DEMO ? 'max-w-5xl lg:grid-cols-[1fr_380px]' : 'max-w-lg')}>
      <Card className="p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight">Sign in to VoteChain</h1>
        <p className="mt-1 text-muted">Voters sign in with the email address their organization invited.</p>

        <div className="mt-6 grid grid-cols-2 rounded-lg bg-surface-2 p-1 text-sm font-medium">
          {[['otp', 'Email code', Mail], ['password', 'Password', KeyRound]].map(([m, l, Icon]) => (
            <button key={m} type="button" onClick={() => { setMode(m); setError(''); setOtpSent(false); setOtp('') }}
              className={cn('flex items-center justify-center gap-2 rounded-md py-2', mode === m ? 'bg-surface shadow-sm' : 'text-muted')}>
              <Icon className="size-4" />{l}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Email">
            <Input type="email" required autoComplete="email" value={email} disabled={otpSent} onChange={(e) => setEmail(e.target.value)} placeholder="you@organization.com" />
          </Field>
          {mode === 'password' && (
            <Field label="Password">
              <Input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </Field>
          )}
          {mode === 'otp' && otpSent && (
            <Field label="6-digit code" hint={devCode ? `Development mode: your code is ${devCode}` : `We sent a code to ${email}. It expires in 10 minutes.`}>
              <Input inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} className="font-mono tracking-[0.4em]" placeholder="000000" />
            </Field>
          )}
          <ErrorText>{error}</ErrorText>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'otp' && !otpSent ? 'Email me a code' : 'Sign in'}
          </Button>
          {mode === 'otp' && otpSent && (
            <button type="button" className="w-full text-center text-sm text-muted hover:text-ink" onClick={() => { setOtpSent(false); setOtp(''); setDevCode('') }}>
              Use a different email
            </button>
          )}
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          Running elections for your organization? <Link to="/register" className="font-medium text-primary hover:underline">Register it</Link>
        </p>
      </Card>

      {SHOW_DEMO && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Demo accounts</h2>
          <p className="mt-1 text-sm text-muted">Sample data for trying VoteChain out. The password for all of them is <code className="font-mono">{DEMO_PASSWORD}</code>.</p>
          <div className="mt-4 space-y-3">
            {demos.map(({ email: e, icon: Icon, title, text }) => (
              <button key={e} disabled={busy} onClick={() => run(async () => done(await login(e, DEMO_PASSWORD)))}
                className="flex w-full items-center gap-4 rounded-xl border border-line bg-surface p-4 text-left transition hover:border-primary hover:shadow-sm disabled:opacity-60">
                <span className="rounded-lg bg-primary-soft p-2.5 text-primary"><Icon className="size-5" /></span>
                <span>
                  <span className="block font-medium">{title}</span>
                  <span className="block text-sm text-muted">{text}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
