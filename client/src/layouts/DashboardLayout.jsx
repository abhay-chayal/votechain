import { useEffect, useRef, useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity, Building2, ClipboardList, History, LayoutDashboard, LogOut, Menu, PlusCircle, Settings,
  ShieldCheck, User, Vote, X, Blocks,
} from 'lucide-react'
import { Logo, ThemeToggle } from '../components/brand'
import { Avatar, Badge, PageLoader } from '../components/ui'
import { useAuth } from '../store/auth'
import { useChainInfo } from '../store/chain'
import { cn } from '../lib/utils'

const NAV = {
  org_admin: [
    { to: '/org', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/org/elections', label: 'Elections', icon: ClipboardList, isActive: (p) => p.startsWith('/org/elections') && p !== '/org/elections/new' },
    { to: '/org/elections/new', label: 'New election', icon: PlusCircle },
    { to: '/org/settings', label: 'Organization', icon: Settings },
  ],
  voter: [
    { to: '/vote', label: 'My elections', icon: Vote, end: true },
    { to: '/vote/history', label: 'Voting history', icon: History },
    { to: '/vote/profile', label: 'Profile', icon: User },
  ],
  platform_admin: [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/organizations', label: 'Organizations', icon: Building2 },
    { to: '/admin/elections', label: 'Elections', icon: ClipboardList },
    { to: '/admin/health', label: 'System health', icon: Activity },
  ],
}
const ROLE_LABEL = { org_admin: 'Organization admin', voter: 'Voter', platform_admin: 'Platform admin' }

export default function DashboardLayout({ role }) {
  const { user, ready, logout } = useAuth()
  const chain = useChainInfo()
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const menuRef = useRef(null)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    const onDoc = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenu(false)
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  if (!ready) return <PageLoader />
  if (!user) return <Navigate to="/login" state={{ from: pathname }} replace />
  if (user.role !== role) return <Navigate to={{ platform_admin: '/admin', org_admin: '/org', voter: '/vote' }[user.role]} replace />

  const org = user.org

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-5">
        <Logo to="/" />
        <button className="rounded-lg p-1.5 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="size-5" /></button>
      </div>
      {org && (
        <div className="mx-3 mb-3 rounded-lg border border-line bg-surface-2/60 px-3 py-2.5">
          <div className="text-xs text-muted">Organization</div>
          <div className="truncate text-sm font-medium">{org.name}</div>
        </div>
      )}
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV[role].map(({ to, label, icon: Icon, end, isActive: match }) => (
          <NavLink
            key={to} to={to} end={end}
            className={({ isActive }) => cn(
              'flex items-center gap-3 rounded-[4px] px-3 py-2 text-sm font-medium transition-colors',
              (match ? match(pathname) : isActive) ? 'bg-surface-2 text-ink shadow-[inset_2px_0_0_var(--primary)]' : 'text-muted hover:bg-surface-2/70 hover:text-ink',
            )}
          >
            <Icon className="size-4.5" />{label}
          </NavLink>
        ))}
      </nav>
      <div className="m-3 rounded-lg border border-line p-3 text-xs">
        <div className="flex items-center gap-2 font-medium"><Blocks className="size-4 text-primary" />{chain.network || 'Blockchain'}</div>
        <div className="mt-1 flex items-center gap-1.5 text-muted">
          <span className={cn('size-1.5 rounded-full', chain.online ? 'bg-success animate-pulse-dot' : 'bg-danger')} />
          {chain.online ? `Connected · block ${chain.block?.toLocaleString('en-US')}` : 'Not connected'}
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-surface lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="animate-fade-in absolute inset-y-0 left-0 w-72 border-r border-line bg-surface">{sidebar}</aside>
        </div>
      )}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur sm:px-6">
        <div className="flex items-center gap-2">
          <button className="rounded-lg p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="size-5" /></button>
          <Badge tone="primary" className="hidden sm:inline-flex"><ShieldCheck className="size-3.5" />{ROLE_LABEL[role]}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenu((m) => !m)} className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-surface-2">
              <Avatar name={user.name} size={32} />
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-medium leading-tight">{user.name}</span>
                <span className="block text-xs text-muted">{user.email}</span>
              </span>
            </button>
            {menu && (
              <div className="animate-fade-in absolute right-0 mt-2 w-56 rounded-lg border border-line bg-surface p-1.5 shadow-lg">
                {role === 'voter' && (
                  <button onClick={() => { setMenu(false); navigate('/vote/profile') }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-2"><User className="size-4" />Profile</button>
                )}
                <button onClick={async () => { await logout(); navigate('/') }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger-soft"><LogOut className="size-4" />Sign out</button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><Outlet /></main>
    </div>
  )
}
