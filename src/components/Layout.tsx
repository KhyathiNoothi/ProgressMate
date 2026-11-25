import { NavLink, Outlet } from 'react-router-dom'
import { BarChart3, CalendarCheck, FileText, LogOut, Target } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useCtx } from '../hooks'
import { cn } from '../lib/utils'
const nav = [
  { to: '/', label: 'Monthly Goals', icon: Target },
  { to: '/daily', label: 'Daily Work Update', icon: CalendarCheck },
  { to: '/progress', label: 'Our Progress', icon: BarChart3 },
  { to: '/insights', label: 'Insights & Reports', icon: FileText },
]
export default function Layout() {
  const { uid, profiles } = useCtx()
  const me = profiles.find(p => p.id === uid)
  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-navy-800/60 p-5 md:flex">
        <div className="mb-8 text-xl font-bold"><span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">ProgressMate</span></div>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map(n => (
            <NavLink key={n.to} to={n.to} end className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition', isActive ? 'bg-gradient-to-r from-purple-600/30 to-blue-600/30 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white')}>
              <n.icon size={18} />{n.label}
            </NavLink>))}
        </nav>
        <div className="flex items-center justify-between text-sm text-slate-400"><span className="truncate">{me?.display_name}</span>
          <button title="Sign out" onClick={() => supabase.auth.signOut()} className="hover:text-white"><LogOut size={16} /></button></div>
      </aside>
      <main className="flex-1 p-4 pb-24 md:p-8"><div className="mx-auto max-w-6xl"><Outlet /></div></main>
      <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-white/10 bg-navy-800/95 p-2 backdrop-blur md:hidden">
        {nav.map(n => (
          <NavLink key={n.to} to={n.to} end className={({ isActive }) => cn('flex flex-col items-center gap-0.5 rounded-lg px-3 py-1 text-[10px]', isActive ? 'text-purple-300' : 'text-slate-400')}>
            <n.icon size={20} />{n.label.split(' ')[0]}
          </NavLink>))}
      </nav>
    </div>)
}
