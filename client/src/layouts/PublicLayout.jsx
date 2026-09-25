import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Logo, ThemeToggle } from '../components/brand'
import { Button } from '../components/ui'
import { useAuth } from '../store/auth'
import { cn } from '../lib/utils'

export const homeFor = (role) => ({ platform_admin: '/admin', org_admin: '/org', voter: '/vote' })[role] || '/'

const links = [
  { to: '/#how', label: 'How it works' },
  { to: '/#features', label: 'Safeguards' },
  { to: '/verify', label: 'Public results' },
  { to: '/receipt', label: 'Check a receipt' },
]

export default function PublicLayout() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={cn('rounded-lg px-3 py-2 text-sm font-medium text-muted hover:text-ink', pathname === l.to && 'text-ink')}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden gap-2 sm:flex">
              {user ? (
                <Button to={homeFor(user.role)}>Open dashboard</Button>
              ) : (
                <>
                  <Button variant="ghost" to="/login">Sign in</Button>
                  <Button to="/register">Run an election</Button>
                </>
              )}
            </div>
            <button className="rounded-lg p-2 md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
        {open && (
          <div className="border-t border-line px-4 py-3 md:hidden" onClick={() => setOpen(false)}>
            {links.map((l) => <NavLink key={l.to} to={l.to} className="block rounded-lg px-3 py-2.5 text-sm font-medium">{l.label}</NavLink>)}
            <div className="mt-2 grid grid-cols-2 gap-2">
              {user ? <Button className="col-span-2" to={homeFor(user.role)}>Open dashboard</Button> : (
                <><Button variant="secondary" to="/login">Sign in</Button><Button to="/register">Run an election</Button></>
              )}
            </div>
          </div>
        )}
      </header>
      <main className="flex-1"><Outlet /></main>
      <footer className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:grid-cols-[1fr_auto_auto] sm:gap-16">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-muted">Online elections with a public, tamper-proof count. A final-year project, 2026.</p>
          </div>
          <nav className="flex flex-col gap-2 text-muted">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-ink">Check</span>
            <Link to="/verify" className="hover:text-ink">Public results</Link>
            <Link to="/receipt" className="hover:text-ink">Verify a receipt</Link>
          </nav>
          <nav className="flex flex-col gap-2 text-muted">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-ink">Organizers</span>
            <Link to="/register" className="hover:text-ink">Register</Link>
            <Link to="/login" className="hover:text-ink">Sign in</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
