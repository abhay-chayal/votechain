import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { Button, Card, ErrorText, Field, Input, Select, Textarea } from '../../components/ui'
import { useAuth } from '../../store/auth'
import { cn } from '../../lib/utils'

const TYPES = ['University', 'College', 'Company', 'Housing society', 'NGO', 'Club', 'Startup', 'Other']

export default function RegisterOrg() {
  const { registerOrg } = useAuth()
  const [busy, setBusy] = useState(false)
  const [serverError, setServerError] = useState('')
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [f, setF] = useState({ orgName: '', type: 'University', size: '', website: '', description: '', name: '', email: '', password: '', agree: false })
  const [errors, setErrors] = useState({})
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const validate = () => {
    const e = {}
    if (step === 0) {
      if (f.orgName.trim().length < 3) e.orgName = 'Enter the full organization name.'
      if (!f.size || +f.size < 2) e.size = 'Enter the approximate number of members.'
    } else {
      if (f.name.trim().length < 2) e.name = 'Enter your name.'
      if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email.'
      if (f.password.length < 8) e.password = 'Use at least 8 characters.'
      if (!f.agree) e.agree = 'Please accept the terms.'
    }
    setErrors(e)
    return !Object.keys(e).length
  }

  const next = async (e) => {
    e.preventDefault()
    if (!validate()) return
    if (step === 0) return setStep(1)
    setBusy(true)
    setServerError('')
    try {
      const { agree, size, ...rest } = f
      await registerOrg({ ...rest, size: Number(size) })
      navigate('/org')
    } catch (err) {
      setServerError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:py-16">
      <h1 className="text-2xl font-bold tracking-tight">Register your organization</h1>
      <p className="mt-1 text-muted">Takes two minutes. You can set up elections right away; publishing opens once VoteChain approves your organization, usually within one working day.</p>

      <ol className="my-8 flex items-center gap-3 text-sm">
        {['Organization', 'Your account'].map((l, i) => (
          <li key={l} className="flex flex-1 items-center gap-2">
            <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold', i <= step ? 'bg-primary text-white' : 'bg-surface-2 text-muted')}>
              {i < step ? <Check className="size-4" /> : i + 1}
            </span>
            <span className={cn('font-medium', i > step && 'text-muted')}>{l}</span>
            {i === 0 && <span className="mx-2 h-px flex-1 bg-line" />}
          </li>
        ))}
      </ol>

      <Card className="p-6 sm:p-8">
        <form onSubmit={next} className="space-y-4" noValidate>
          {step === 0 ? (
            <>
              <Field label="Organization name" error={errors.orgName}><Input value={f.orgName} onChange={set('orgName')} placeholder="e.g. Northfield Institute of Technology" /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Type"><Select value={f.type} onChange={set('type')}>{TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
                <Field label="Number of members" error={errors.size}><Input type="number" min="2" value={f.size} onChange={set('size')} placeholder="1200" /></Field>
              </div>
              <Field label="Website (optional)"><Input value={f.website} onChange={set('website')} placeholder="example.org" /></Field>
              <Field label="What will you use VoteChain for? (optional)"><Textarea value={f.description} onChange={set('description')} placeholder="Student council elections, department reps…" /></Field>
            </>
          ) : (
            <>
              <Field label="Your full name" error={errors.name}><Input value={f.name} onChange={set('name')} autoComplete="name" /></Field>
              <Field label="Work email" error={errors.email} hint="Use your organization's domain so we can verify you faster."><Input type="email" value={f.email} onChange={set('email')} autoComplete="email" /></Field>
              <Field label="Password" error={errors.password}><Input type="password" value={f.password} onChange={set('password')} autoComplete="new-password" /></Field>
              <label className="flex items-start gap-2.5 text-sm">
                <input type="checkbox" checked={f.agree} onChange={set('agree')} className="mt-0.5 size-4 accent-[var(--primary)]" />
                <span className={errors.agree ? 'text-danger' : 'text-muted'}>I confirm that I'm authorized to run elections for this organization, and I accept the terms of use.</span>
              </label>
            </>
          )}
          <ErrorText>{serverError}</ErrorText>
          <div className="flex justify-between gap-3 pt-2">
            {step === 1 ? <Button type="button" variant="secondary" onClick={() => setStep(0)}>Back</Button> : <span />}
            <Button type="submit" disabled={busy}>{step === 0 ? 'Continue' : busy ? 'Creating…' : 'Create organization'}</Button>
          </div>
        </form>
      </Card>
      <p className="mt-6 text-center text-sm text-muted">Already registered? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link></p>
    </div>
  )
}
