import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Check, Copy, ExternalLink, Loader2, X } from 'lucide-react'
import { cn, colorFor, countdownParts, initials, shortHash } from '../lib/utils'
import { useChainInfo } from '../store/chain'

export function Button({ as: As = 'button', to, variant = 'primary', size = 'md', className, children, ...props }) {
  const variants = {
    primary: 'bg-primary text-on-primary hover:bg-primary-hover',
    secondary: 'bg-surface text-ink border border-line-strong hover:bg-surface-2',
    ghost: 'text-muted hover:text-ink hover:bg-surface-2',
    danger: 'bg-danger text-on-primary hover:opacity-90',
    soft: 'bg-primary-soft text-primary-ink hover:bg-primary-soft/70',
  }
  const sizes = { sm: 'h-8 px-3 text-[13px] gap-1.5', md: 'h-10 px-4 text-sm gap-2', lg: 'h-11 px-5 text-[15px] gap-2' }
  const Comp = to && !props.disabled ? Link : As
  return (
    <Comp
      to={to && !props.disabled ? to : undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap',
        variants[variant], sizes[size], className,
      )}
      {...props}
    >
      {children}
    </Comp>
  )
}

export const Card = ({ className, children, ...p }) => (
  <div className={cn('rounded-md border border-line bg-surface', className)} {...p}>{children}</div>
)

export const CardHeader = ({ title, subtitle, action, className }) => (
  <div className={cn('flex items-start justify-between gap-4 border-b border-line px-5 py-4', className)}>
    <div className="min-w-0">
      <h3 className="text-[15px] font-semibold">{title}</h3>
      {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
    </div>
    {action}
  </div>
)

const tones = {
  neutral: 'bg-surface-2 text-muted',
  primary: 'bg-primary-soft text-primary-ink',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
}
/** Small uppercase label, styled like a rubber stamp rather than a pill. */
export const Badge = ({ tone = 'neutral', className, children }) => (
  <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-[3px] px-1.5 py-[3px] text-[10.5px] font-semibold uppercase leading-none tracking-[0.07em]', tones[tone], className)}>{children}</span>
)

const STATUS = {
  live: ['success', 'Live'], scheduled: ['info', 'Scheduled'], draft: ['neutral', 'Draft'],
  closed: ['warning', 'Closed'], published: ['primary', 'Results out'],
  active: ['success', 'Active'], pending: ['warning', 'Pending review'], suspended: ['danger', 'Suspended'],
  voted: ['success', 'Voted'], registered: ['info', 'Signed in'], invited: ['neutral', 'Invited'],
}
export function StatusBadge({ status }) {
  const [tone, label] = STATUS[status] || ['neutral', status]
  return (
    <Badge tone={tone}>
      {status === 'live' && <span className="size-1.5 rounded-full bg-stamp animate-pulse-dot" />}
      {label}
    </Badge>
  )
}

export function Avatar({ name, size = 40, className }) {
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-medium text-[#fffdf8]', className)}
      style={{ width: size, height: size, background: colorFor(name), fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}

export const PageHeader = ({ title, subtitle, actions, back }) => (
  <div className="mb-7 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      {back}
      <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.01em] sm:text-[32px]">{title}</h1>
      {subtitle && <p className="mt-1.5 text-muted">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
)

// eslint-disable-next-line no-unused-vars
export const StatCard = ({ label, value, hint, icon, tone }) => (
  <Card className="px-5 py-4">
    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</div>
    <div className="mt-2 font-display text-[30px] font-semibold leading-none tabular-nums">{value}</div>
    {hint && <div className="mt-2 text-xs text-muted">{hint}</div>}
  </Card>
)

export const Progress = ({ value, className, tone = 'bg-primary' }) => (
  <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-2', className)}>
    <div className={cn('h-full rounded-full transition-all duration-700', tone)} style={{ width: `${Math.min(100, value)}%` }} />
  </div>
)

export function Field({ label, hint, error, children, className }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-danger">{error}</span> : hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  )
}

const inputCls = 'w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60'
export const Input = ({ className, ...p }) => <input className={cn(inputCls, 'h-10', className)} {...p} />
export const Textarea = ({ className, ...p }) => <textarea className={cn(inputCls, 'min-h-24', className)} {...p} />
export const Select = ({ className, children, ...p }) => <select className={cn(inputCls, 'h-10', className)} {...p}>{children}</select>

export function Modal({ open, onClose, title, children, footer, dismissible = true }) {
  useEffect(() => {
    if (!open || !dismissible) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, dismissible, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1b1a17]/45 p-4 sm:items-center" onClick={() => dismissible && onClose?.()}>
      <div role="dialog" aria-modal="true" className="animate-fade-in w-full max-w-lg rounded-md border border-line bg-surface shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {dismissible && <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-surface-2" aria-label="Close"><X className="size-4" /></button>}
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-4">{footer}</div>}
      </div>
    </div>
  )
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            '-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
            value === t.value ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-ink',
          )}
        >
          {t.label}
          {t.count != null && <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-xs">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

export const EmptyState = ({ icon: Icon, title, text, action }) => (
  <div className="flex flex-col items-center px-6 py-14 text-center">
    {Icon && <span className="mb-4 rounded-lg bg-surface-2 p-4 text-muted"><Icon className="size-6" /></span>}
    <h3 className="font-semibold">{title}</h3>
    {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
)

export function CopyButton({ value, className }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      className={cn('rounded p-1 text-muted hover:bg-surface-2 hover:text-ink', className)}
      onClick={() => { navigator.clipboard?.writeText(value).catch(() => {}); setDone(true); setTimeout(() => setDone(false), 1200) }}
      aria-label="Copy"
    >
      {done ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
    </button>
  )
}

export function Hash({ value, kind = 'tx', full = false }) {
  const { explorer } = useChainInfo()
  const path = kind === 'address' ? 'address' : 'tx'
  if (!value) return <span className="text-muted">—</span>
  return (
    <span className="inline-flex max-w-full items-center gap-1 font-mono text-xs">
      <span className="truncate">{full ? value : shortHash(value)}</span>
      <CopyButton value={value} />
      {kind !== 'token' && explorer && (
        <a href={`${explorer}/${path}/${value}`} target="_blank" rel="noreferrer" className="rounded p-1 text-muted hover:bg-surface-2 hover:text-ink" aria-label="Open in block explorer">
          <ExternalLink className="size-3.5" />
        </a>
      )}
    </span>
  )
}

export function Countdown({ to, label }) {
  const [, tick] = useState(0)
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(t) }, [])
  const { d, h, m, s } = countdownParts(to)
  const cells = [[d, 'days'], [h, 'hrs'], [m, 'min'], [s, 'sec']]
  return (
    <div>
      {label && <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{label}</div>}
      <div className="flex gap-2">
        {cells.map(([n, u]) => (
          <div key={u} className="min-w-14 rounded-lg bg-surface-2 px-2 py-1.5 text-center">
            <div className="font-mono text-lg font-semibold tabular-nums">{String(n).padStart(2, '0')}</div>
            <div className="text-[10px] uppercase tracking-wide text-muted">{u}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export const Table = ({ head, children }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left text-sm">
      <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
        <tr>{head.map((h) => <th key={h} className="whitespace-nowrap px-5 py-3 font-medium">{h}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-line">{children}</tbody>
    </table>
  </div>
)
export const Td = ({ className, children, ...p }) => <td className={cn('px-5 py-3.5 align-middle', className)} {...p}>{children}</td>

export const Spinner = ({ className }) => <Loader2 className={cn('size-5 animate-spin text-primary', className)} />

export const PageLoader = () => (
  <div className="flex justify-center py-24" aria-label="Loading"><Spinner className="size-7" /></div>
)

export function ErrorState({ error, onRetry }) {
  return (
    <Card className="flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-4 rounded-lg bg-danger-soft p-4 text-danger"><AlertTriangle className="size-6" /></span>
      <h3 className="font-semibold">{error?.status === 404 ? 'Not found' : 'Something went wrong'}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{error?.message || 'Please try again.'}</p>
      {onRetry && error?.status !== 404 && <Button variant="secondary" className="mt-5" onClick={() => onRetry()}>Try again</Button>}
    </Card>
  )
}

/** Renders loading / error states for a useApi() result, then children(data). */
export function Async({ q, children }) {
  if (q.loading && !q.data) return <PageLoader />
  if (q.error && !q.data) return <ErrorState error={q.error} onRetry={q.reload} />
  return q.data ? children(q.data) : null
}

export const ErrorText = ({ children }) => children ? <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{children}</p> : null
