import { useState } from 'react'
import { ChevronDown, ChevronUp, Pencil, Trash2, X } from 'lucide-react'
import { api } from '../services/api'
import { useCtx, useLive } from '../hooks'
import type { Category, Goal } from '../lib/types'
import { CATS, addDays, daysBetween, fmtD, goalPct, today } from '../lib/utils'
import { Button, Card, Field, Input, Page, Progress, Select, Textarea } from '../components/ui'
import WeeklyTasks from '../components/WeeklyTasks'

const blank = () => ({ id: undefined as string | undefined, title: '', description: '', category: '', start_date: today(), end_date: '', priority: 'medium' })
const pri = { high: 'text-red-600 bg-red-50', medium: 'text-amber-600 bg-amber-50', low: 'text-emerald-600 bg-emerald-50' }
const statusOf = (p: number): Goal['status'] => (p >= 100 ? 'completed' : p > 0 ? 'in_progress' : 'not_started')
const isOver = (g: Goal) => g.status !== 'completed' && g.end_date! < today()
const dueIn = (g: Goal) => daysBetween(today(), g.end_date!)

function Timeline({ goals }: { goals: Goal[] }) {
  if (!goals.length) return null
  const min = goals.reduce((m, g) => (g.start_date! < m ? g.start_date! : m), goals[0].start_date!)
  const max = goals.reduce((m, g) => (g.end_date! > m ? g.end_date! : m), goals[0].end_date!)
  const span = Math.max(1, daysBetween(min, max) + 1)
  const pos = (d: string) => (daysBetween(min, d) / span) * 100
  const t = today(); const col = { completed: 'bg-[#9BD1BD]', in_progress: 'bg-[#C8E9D8]', not_started: 'bg-[#E3EDE6]' }
  return (
    <Card>
      <div className="mb-2 flex justify-between text-xs text-brand-muted"><span>{fmtD(min)}</span><span>Timeline</span><span>{fmtD(max)}</span></div>
      <div className="relative space-y-1.5">
        {t >= min && t <= max && <div className="absolute inset-y-0 z-10 w-px bg-brand-deep" style={{ left: `${pos(t)}%` }} title="Today" />}
        {goals.map(g => (
          <div key={g.id} className="relative h-6 rounded bg-brand-soft">
            <div className={`absolute top-0 flex h-6 items-center overflow-hidden rounded px-2 text-xs text-brand-ink ${isOver(g) ? 'bg-red-200' : col[g.status]}`}
              style={{ left: `${pos(g.start_date!)}%`, width: `${Math.max(3, ((daysBetween(g.start_date!, g.end_date!) + 1) / span) * 100)}%` }}
              title={`${g.title}: ${fmtD(g.start_date!)} to ${fmtD(g.end_date!)}`}><span className="truncate">{g.title}</span></div>
          </div>))}
      </div>
    </Card>)
}

export default function Goals() {
  const { uid, profiles } = useCtx()
  const { data: goals, reload } = useLive<Goal>('goals', () => api.allGoals(), [])
  const { data: cats, reload: reloadCats } = useLive<Category>('categories', () => api.categories(), [])
  const names = cats.length ? cats.map(c => c.name) : CATS
  const [f, setF] = useState(blank()); const [newCat, setNewCat] = useState('')
  const [err, setErr] = useState(''); const [open, setOpen] = useState<string | null>(null)
  const cat = f.category || names[0]
  const mineGoals = goals.filter(g => g.user_id === uid)
  const overdue = mineGoals.filter(isOver)
  const upcoming = mineGoals.filter(g => g.status !== 'completed' && dueIn(g) >= 0 && dueIn(g) <= 14)

  const addCat = async () => {
    const name = newCat.trim(); if (!name) return
    await api.addCategories([...(cats.length ? [] : CATS), name])
    setF({ ...f, category: name }); setNewCat(''); reloadCats()
  }
  const save = async () => {
    if (!f.title.trim()) return setErr('Add a goal title')
    if (!f.end_date) return setErr('Pick a target completion date')
    if (f.end_date < f.start_date) return setErr('Target date must be on or after the start date')
    const old = goals.find(g => g.id === f.id)
    const { error } = await api.saveGoal({ ...(old ?? { target: 100, progress: 0, unit: '%', status: 'not_started', milestones: [] }),
      user_id: uid, title: f.title.trim(), description: f.description, category: cat, start_date: f.start_date, end_date: f.end_date,
      deadline: f.end_date, month: f.start_date.slice(0, 7), priority: f.priority as Goal['priority'] })
    if (error) setErr(error.message); else { setErr(''); setF(blank()); reload() }
  }
  const setProgress = async (g: Goal, pct: number, status?: Goal['status']) => {
    pct = Math.max(0, Math.min(100, pct))
    await api.saveGoal({ ...g, progress: Math.round(((pct * g.target) / 100) * 100) / 100, status: status ?? statusOf(pct) }); reload()
  }
  const setStatus = (g: Goal, s: Goal['status']) => { const p = goalPct(g); setProgress(g, s === 'completed' ? 100 : s === 'not_started' ? 0 : p === 0 || p >= 100 ? 10 : p, s) }
  const edit = (g: Goal) => { setF({ id: g.id, title: g.title, description: g.description ?? '', category: g.category, start_date: g.start_date!, end_date: g.end_date!, priority: g.priority }); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return (
    <Page title="Goals & Milestones" sub="Goals with any timeline, even across months. Add weekly tasks or questions inside each goal.">
      {(!!overdue.length || !!upcoming.length) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card><p className="mb-2 font-semibold text-red-600">Overdue ({overdue.length})</p>{overdue.map(g => <p key={g.id} className="text-sm">{g.title} <span className="text-brand-muted">· due {fmtD(g.end_date!)}</span></p>)}{!overdue.length && <p className="text-sm text-brand-muted">Nothing overdue.</p>}</Card>
          <Card><p className="mb-2 font-semibold text-amber-600">Due in next 14 days ({upcoming.length})</p>{upcoming.map(g => <p key={g.id} className="text-sm">{g.title} <span className="text-brand-muted">· {dueIn(g) === 0 ? 'today' : `in ${dueIn(g)}d`}</span></p>)}{!upcoming.length && <p className="text-sm text-brand-muted">No upcoming deadlines.</p>}</Card>
        </div>)}

      <Card>
        <h2 className="mb-3 font-semibold text-brand-ink">{f.id ? 'Edit goal' : 'Add a goal'}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Goal title" className="lg:col-span-2"><Input value={f.title} placeholder="e.g. Finish Transformer fundamentals" onChange={e => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Priority"><Select value={f.priority} onChange={e => setF({ ...f, priority: e.target.value })}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></Select></Field>
          <Field label="Category"><Select value={cat} onChange={e => setF({ ...f, category: e.target.value })}>{names.map(c => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="Start date"><Input type="date" value={f.start_date} onChange={e => setF({ ...f, start_date: e.target.value })} /></Field>
          <Field label="Target completion date"><Input type="date" min={f.start_date} value={f.end_date} onChange={e => setF({ ...f, end_date: e.target.value })} />
            <div className="mt-1.5 flex flex-wrap gap-1">{[['2 wks', 14], ['1 mo', 30], ['2 mo', 60], ['3 mo', 90]].map(([l, n]) => <button key={l} type="button" onClick={() => setF({ ...f, end_date: addDays(f.start_date, n as number) })} className="rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand-body hover:bg-brand-hover">{l}</button>)}</div></Field>
          <Field label="New category"><div className="flex gap-2"><Input value={newCat} placeholder="e.g. System Design" onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCat()} /><Button variant="ghost" onClick={addCat}>Add</Button></div></Field>
          <Field label="Description" className="sm:col-span-2 lg:col-span-4"><Textarea rows={2} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></Field>
        </div>
        {!!cats.length && <div className="mt-3 flex flex-wrap gap-2">{cats.map(c => <span key={c.id} className="flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs">{c.name}<button title="Remove category" onClick={async () => { await api.deleteCategory(c.id); reloadCats() }}><X size={12} /></button></span>)}</div>}
        {err && <p className="mt-2 text-sm text-red-500">{err}</p>}
        <div className="mt-4 flex gap-2"><Button onClick={save}>{f.id ? 'Save changes' : 'Add goal'}</Button>{f.id && <Button variant="ghost" onClick={() => { setF(blank()); setErr('') }}>Cancel</Button>}</div>
      </Card>

      {profiles.map(p => {
        const mine = p.id === uid; const list = goals.filter(g => g.user_id === p.id)
        return (
          <section key={p.id} className="space-y-3">
            <h2 className="text-lg font-semibold text-brand-ink">{mine ? 'My goals' : `${p.display_name}'s goals`}</h2>
            {!list.length && <p className="text-sm text-brand-muted">No goals yet.</p>}
            <Timeline goals={list} />
            <div className="grid gap-4 lg:grid-cols-2">
              {list.map(g => (
                <Card key={g.id} className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div><p className="text-xs text-brand-deep">{g.category}</p><p className="font-medium text-brand-ink">{g.title}</p></div>
                    <div className="flex gap-1">{isOver(g) && <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">overdue</span>}<span className={`rounded-full px-2 py-0.5 text-xs ${pri[g.priority]}`}>{g.priority}</span></div>
                  </div>
                  {g.description && <p className="text-sm text-brand-muted">{g.description}</p>}
                  <p className="text-xs text-brand-muted">{fmtD(g.start_date!)} → {fmtD(g.end_date!)} · {daysBetween(g.start_date!, g.end_date!) + 1} days</p>
                  <Progress value={goalPct(g)} />
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-brand-body">{goalPct(g)}%</span>
                    {mine ? (<>
                      <Input type="number" min={0} max={100} className="w-20" defaultValue={goalPct(g)} key={goalPct(g)} onBlur={e => +e.target.value !== goalPct(g) && setProgress(g, +e.target.value)} />
                      <Select className="w-36" value={g.status} onChange={e => setStatus(g, e.target.value as Goal['status'])}><option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="completed">Completed</option></Select>
                      <Button variant="ghost" onClick={() => edit(g)}><Pencil size={15} /></Button>
                      <Button variant="danger" onClick={async () => { if (confirm('Delete this goal and its weekly tasks?')) { await api.deleteGoal(g.id!); reload() } }}><Trash2 size={15} /></Button>
                    </>) : <span className="text-brand-muted">{g.status.replace('_', ' ')}</span>}
                  </div>
                  <button className="flex items-center gap-1 text-sm text-brand-deep" onClick={() => setOpen(open === g.id ? null : g.id!)}>
                    {open === g.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}Weekly tasks
                  </button>
                  {open === g.id && <WeeklyTasks goal={g} mine={mine} />}
                </Card>))}
            </div>
          </section>)
      })}
    </Page>)
}
