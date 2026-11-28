import { NavLink, Outlet } from 'react-router-dom'
import { BarChart3, CalendarCheck, FileText, LogOut, Target } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useCtx } from '../hooks'
import { cn } from '../lib/utils'
import { BrandMark } from './ui'

const nav = [
  { to: '/', label: 'Goals & Milestones', icon: Target },
  { to: '/daily', label: 'Daily Updates', icon: CalendarCheck },
  { to: '/progress', label: 'Our Progress', icon: BarChart3 },
  { to: '/insights', label: 'Insights & Reports', icon: FileText },
]

export default function Layout() {
  const { uid, profiles } = useCtx()
  const me = profiles.find(p => p.id === uid)
  const initials = (me?.display_name || 'U')
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-brand-line bg-white px-4 py-5 md:flex">
        <div className="mb-7 flex items-center gap-2.5 px-2">
          <BrandMark size={30} />
          <span className="text-base font-semibold tracking-tight text-brand-ink">ProgressMate</span>
        </div>

        <p className="mb-2 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
          Workspace
        </p>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-soft text-brand-deep'
                    : 'text-brand-muted hover:bg-brand-bg hover:text-brand-ink'
                )
              }
            >
              <n.icon size={17} />
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center justify-between gap-2 rounded-lg border border-brand-line bg-brand-bg/70 px-2.5 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-deep">
              {initials}
            </span>
            <span className="truncate text-xs font-medium text-brand-ink">{me?.display_name}</span>
          </div>
          <button
            title="Sign out"
            onClick={() => supabase.auth.signOut()}
            className="rounded-md p-1.5 text-brand-muted transition hover:bg-white hover:text-brand-ink"
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:py-7">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-brand-line bg-white/95 px-2 py-1.5 backdrop-blur md:hidden">
        {nav.map(n => (
          <NavLink
            key={n.to}
            to={n.to}
            end
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 rounded-lg px-3 py-1 text-[10px] font-medium transition-colors',
                isActive ? 'text-brand-deep' : 'text-brand-muted'
              )
            }
          >
            <n.icon size={19} />
            {n.label.split(' ')[0]}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
