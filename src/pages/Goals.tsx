import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { api } from '../services/api'
import { useCtx, useLive } from '../hooks'
import type { Goal } from '../lib/types'
import { CATS, goalPct, thisMonth } from '../lib/utils'
import { Button, Card, Field, Input, Page, Progress, Select } from '../components/ui'

const empty = { category: CATS[0], title: '', target: 10, unit: 'problems', deadline: '', priority: 'medium', w: ['', '', '', ''] }
const pri = { high: 'text-red-300 bg-red-500/10', medium: 'text-amber-300 bg-amber-500/10', low: 'text-emerald-300 bg-emerald-500/10' }

export default function Goals() {
  const { uid, profiles } = useCtx()
  const [month, setMonth] = useState(thisMonth())
  const { data: goals, reload } = useLive<Goal>('goals', () => api.goals(month), [month])
  const [f, setF] = useState(empty); const [err, setErr] = useState('')

  const add = async () => {
    if (!f.title.trim()) return setErr('Give the goal a title')
    const { error } = await api.saveGoal({ user_id: uid, month, category: f.category, title: f.title, target: +f.target, unit: f.unit, deadline: f.deadline || null,
      priority: f.priority as Goal['priority'], progress: 0, status: 'not_started', milestones: f.w.map((text, i) => ({ week: i + 1, text, done: false })).filter(m => m.text) })
    if (error) setErr(error.message); else { setErr(''); setF(empty); reload() }
  }
  const patch = async (g: Goal, p: Partial<Goal>) => {
    const n = { ...g, ...p }
    n.status = n.progress >= n.target ? 'completed' : n.progress > 0 ? 'in_progress' : 'not_started'
    await api.saveGoal(n); reload()
  }

  return (
    <Page title="Monthly Goals" sub="Set your targets. Your partner can see them, but only you can edit yours."
      right={<Input type="month" className="w-44" value={month} onChange={e => setMonth(e.target.value)} />}>
      <Card>
        <h2 className="mb-3 font-semibold text-white">Add a goal</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Category"><Select value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{CATS.map(c => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="Title" className="lg:col-span-3"><Input value={f.title} placeholder="e.g. Solve 40 graph problems" onChange={e => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Target"><Input type="number" min={1} value={f.target} onChange={e => setF({ ...f, target: +e.target.value })} /></Field>
          <Field label="Unit"><Input value={f.unit} onChange={e => setF({ ...f, unit: e.target.value })} /></Field>
          <Field label="Deadline"><Input type="date" value={f.deadline} onChange={e => setF({ ...f, deadline: e.target.value })} /></Field>
          <Field label="Priority"><Select value={f.priority} onChange={e => setF({ ...f, priority: e.target.value })}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></Select></Field>
          {f.w.map((w, i) => <Field key={i} label={`Week ${i + 1} milestone`}><Input value={w} onChange={e => setF({ ...f, w: f.w.map((x, j) => (j === i ? e.target.value : x)) })} /></Field>)}
        </div>
        {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
        <Button className="mt-4" onClick={add}>Add goal</Button>
      </Card>

      {profiles.map(p => {
        const mine = p.id === uid; const list = goals.filter(g => g.user_id === p.id)
        return (
          <section key={p.id} className="space-y-3">
            <h2 className="text-lg font-semibold text-white">{mine ? 'My goals' : `${p.display_name}'s goals`}</h2>
            {!list.length && <p className="text-sm text-slate-500">No goals for this month yet.</p>}
            <div className="grid gap-4 lg:grid-cols-2">
              {list.map(g => (
                <Card key={g.id} className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div><p className="text-xs text-purple-300">{g.category}</p><p className="font-medium text-white">{g.title}</p></div>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${pri[g.priority]}`}>{g.priority}</span>
                  </div>
                  <Progress value={goalPct(g)} />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-400">
                    <span>{g.progress}/{g.target} {g.unit} · {goalPct(g)}% · {g.status.replace('_', ' ')}</span>
                    <span>{g.deadline ? `Due ${g.deadline}` : 'No deadline'}</span>
                  </div>
                  {g.milestones.map((m, i) => (
                    <label key={i} className="flex items-center gap-2 text-sm text-slate-300">
                      <input type="checkbox" disabled={!mine} checked={m.done} onChange={() => patch(g, { milestones: g.milestones.map((x, j) => (j === i ? { ...x, done: !x.done } : x)) })} />
                      <span className={m.done ? 'line-through opacity-60' : ''}>Wk {m.week}: {m.text}</span>
                    </label>))}
                  {mine && (
                    <div className="flex items-center gap-2 border-t border-white/10 pt-3">
                      <Input type="number" min={0} className="w-24" defaultValue={g.progress} key={g.progress} onBlur={e => +e.target.value !== g.progress && patch(g, { progress: +e.target.value })} />
                      <span className="text-xs text-slate-500">progress ({g.unit})</span>
                      <Button variant="danger" className="ml-auto" onClick={async () => { await api.deleteGoal(g.id!); reload() }}><Trash2 size={15} /></Button>
                    </div>)}
                </Card>))}
            </div>
          </section>)
      })}
    </Page>)
}
