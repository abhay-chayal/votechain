import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { cn } from '../lib/utils'

/** A ballot slip going into a box. */
export const LogoMark = ({ className }) => (
  <svg viewBox="0 0 32 32" className={cn('size-7', className)} aria-hidden>
    <rect x="10" y="2.5" width="12" height="13" rx="1.2" fill="var(--surface)" stroke="var(--primary)" strokeWidth="1.8" />
    <path d="M13 8.6l2.1 2.1 3.9-4.1" fill="none" stroke="var(--stamp)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3.5 14.5h25v11.5a2.5 2.5 0 0 1-2.5 2.5H6a2.5 2.5 0 0 1-2.5-2.5z" fill="var(--primary)" />
    <rect x="8" y="17.6" width="16" height="1.8" rx=".9" fill="var(--on-primary)" opacity=".45" />
  </svg>
)

export const Logo = ({ className, to = '/' }) => (
  <Link to={to} className={cn('inline-flex items-center gap-2', className)}>
    <LogoMark />
    <span className="font-display text-[21px] font-semibold tracking-[-0.01em]">VoteChain</span>
  </Link>
)

export function ThemeToggle({ className }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try { localStorage.setItem('vc-theme', dark ? 'dark' : 'light') } catch {}
  }, [dark])
  return (
    <button
      onClick={() => setDark((d) => !d)}
      className={cn('rounded-md p-2 text-muted hover:bg-surface-2 hover:text-ink', className)}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </button>
  )
}
