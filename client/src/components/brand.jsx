import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { cn } from '../lib/utils'

export const Logo = ({ className, to = '/' }) => (
  <Link to={to} className={cn('inline-flex items-center gap-2 font-bold tracking-tight', className)}>
    <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--primary)" />
      <path d="M9 16.5l4.5 4.5L23 11.5" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span className="text-lg">VoteChain</span>
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
      className={cn('rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink', className)}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  )
}
