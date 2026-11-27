import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../services/api'
import { useCtx, useLive } from '../hooks'
import type { Goal, Update, WeeklyTask } from '../lib/types'
import { CATS, addDays, daysBetween, fmtD, goalPct, summarize, thisMonth, today, weekStart } from '../lib/utils'
import { Button, Card, Field, Input, Page, Select, Stat } from '../components/ui'

type Preset = '7' | '30' | 'month' | 'custom'
const COL = ['#4F9D91', '#D9A66B']
const PRESETS: [Preset, string][] = [['7', 'Last 7 days'], ['30', 'Last 30 days'], ['month', 'This month'], ['custom', 'Custom range']]

export default function Insights() {
  const { uid, profiles } = useCtx()
  const [preset, setPreset] = useState<Preset>('month')
  const [from, setFrom] = useState(thisMonth() + '-01'); const [to, setTo] = useState(today())
  const [scope, setScope] = useState(uid)
  const valid = !!from && !!to && from <= to && daysBetween(from, to) < 366
  const apply = (p: Preset) => {
    setPreset(p)
    if (p === '7') { setFrom(addDays(today(), -6)); setTo(today()) }
    if (p === '30') { setFrom(addDays(today(), -29)); setTo(today()) }
    if (p === 'month') { setFrom(thisMonth() + '-01'); setTo(today()) }
  }
  const { data: ups } = useLive<Update>('daily_updates', () => (valid ? api.updates(from, to) : Promise.resolve([])), [from, to, valid])
  const { data: goals } = useLive<Goal>('goals', () => api.allGoals(), [])
  const { data: tasks } = useLive<WeeklyTask>('weekly_tasks', () => (valid ? api.allTasks(weekStart(from), to) : Promise.resolve([])), [from, to, valid])
  const members = scope === 'all' ? profiles : profiles.filter(p => p.id === scope)

  const rows = useMemo(() => members.map(p => {
    const u = ups.filter(x => x.user_id === p.id && !x.is_draft).sort((a, b) => a.date.localeCompare(b.date))
    const g = goals.filter(x => x.user_id === p.id && x.start_date! <= to && x.end_date! >= from)
    const t = tasks.filter(x => x.user_id === p.id)
    const s = summarize(u, g)
    const el = Math.max(1, daysBetween(from, to < today() ? to : today()) + 1)
    const weak = CATS.concat(g.map(x => x.category)).filter((c, i, a) => a.indexOf(c) === i).map(c => { const gs = g.filter(x => x.category === c); return { c, pct: gs.length ? Math.round(gs.reduce((a, x) => a + goalPct(x), 0) / gs.length) : null } }).filter(x => x.pct !== null && x.pct < 50)
    const rev: Record<string, number> = {}
    u.filter(x => x.challenges.trim()).forEach(x => x.topics.forEach(tp => (rev[tp] = (rev[tp] ?? 0) + 1)))
    return { p, u, g, s, consistency: Math.min(100, Math.round((s.days / el) * 100)), tDone: t.filter(x => x.is_done).length, tTotal: t.length, weak, revise: Object.entries(rev).sort((a, b) => b[1] - a[1]) }
  }), [ups, goals, tasks, scope, from, to, profiles])

  const days = useMemo(() => { const a: string[] = []; if (valid) for (let d = from; d <= to; d = addDays(d, 1)) a.push(d); return a }, [from, to, valid])
  const daily = days.map(d => { const o: any = { day: d.slice(5) }; rows.forEach(r => { o[r.p.display_name] = r.u.filter(x => x.date === d).reduce((a, x) => a + Number(x.hours), 0) }); return o })
  const weekly = Array.from(new Set<string>(days.map(d => weekStart(d)))).map((w: string) => { const o: any = { week: w.slice(5) }; rows.forEach(r => { o[r.p.display_name] = r.u.filter(x => weekStart(x.date) === w).reduce((a, x) => a + x.leetcode_count, 0) }); return o })

  const pctT = (r: { tDone: number; tTotal: number }) => (r.tTotal ? Math.round((r.tDone / r.tTotal) * 100) : 0)
  const report = valid ? `# Progress Report: ${fmtD(from)} to ${fmtD(to)}\n\n` + rows.map(r => `## ${r.p.display_name}

### Summary
- Study hours: ${r.s.hours.toFixed(1)}
- Active days: ${r.s.days} (${r.consistency}% consistency)
- LeetCode problems solved: ${r.s.lc}
- Goals completed: ${r.s.done}/${r.s.total}
- Weekly tasks completed: ${r.tDone}/${r.tTotal} (${pctT(r)}%)

### Completed goals
${r.g.filter(x => x.status === 'completed').map(x => `- ${x.title} (${x.category})`).join('\n') || '- None'}

### Pending goals
${r.g.filter(x => x.status !== 'completed').map(x => `- ${x.title} (${x.category}): ${goalPct(x)}%, due ${fmtD(x.end_date!)}`).join('\n') || '- None'}

### Weak areas (below 50% of target)
${r.weak.map(w => `- ${w.c}: ${w.pct}%`).join('\n') || '- None'}

### Topics to revise
${r.revise.map(([t, n]) => `- ${t} (${n}x)`).join('\n') || '- None'}

### Daily updates
${r.u.map(x => `- ${x.date} (${x.hours}h): ${(x.completed || x.tasks || x.worked_on || '').replace(/\n/g, ' ').slice(0, 160)}`).join('\n') || '- None'}
`).join('\n') : ''
  const download = () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([report], { type: 'text/markdown' }))
    a.download = `progress-report-${from}_to_${to}.md`; a.click(); URL.revokeObjectURL(a.href)
  }
  const tip = { contentStyle: { background: '#fff', border: '1px solid #E3EDE6' } }

  return (
    <Page title="Reports & Analytics" sub="Pick any date range. Only data inside it is included.">
      <Card className="space-y-3">
        <div className="flex flex-wrap gap-2">{PRESETS.map(([k, l]) => <Button key={k} variant={preset === k ? undefined : 'ghost'} onClick={() => apply(k)}>{l}</Button>)}</div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Start date"><Input type="date" value={from} onChange={e => { setFrom(e.target.value); setPreset('custom') }} /></Field>
          <Field label="End date"><Input type="date" value={to} onChange={e => { setTo(e.target.value); setPreset('custom') }} /></Field>
          <Field label="Report for"><Select value={scope} onChange={e => setScope(e.target.value)}>{profiles.map(p => <option key={p.id} value={p.id}>{p.id === uid ? 'Me' : p.display_name}</option>)}<option value="all">Combined workspace</option></Select></Field>
        </div>
        {!valid && <p className="text-sm text-red-500">Choose a start date on or before the end date (max 366 days).</p>}
        {valid && <p className="text-sm text-brand-muted">{fmtD(from)} to {fmtD(to)} · {days.length} days</p>}
      </Card>
      {valid && <>
        <div className={`grid gap-4 ${rows.length > 1 ? 'lg:grid-cols-2' : ''}`}>
          {rows.map(r => (
            <Card key={r.p.id} className="space-y-4">
              <h2 className="font-semibold text-brand-ink">{r.p.id === uid ? `${r.p.display_name} (you)` : r.p.display_name}</h2>
              <div className="grid grid-cols-3 gap-3"><Stat label="Hours" value={r.s.hours.toFixed(1)} /><Stat label="Active days" value={r.s.days} /><Stat label="Consistency" value={`${r.consistency}%`} /><Stat label="LeetCode" value={r.s.lc} /><Stat label="Goals done" value={`${r.s.done}/${r.s.total}`} /><Stat label="Weekly tasks" value={`${pctT(r)}%`} /></div>
              <div className="text-sm"><p className="text-xs text-brand-muted">Weak areas</p>{r.weak.length ? r.weak.map(w => <p key={w.c}>{w.c}: <span className="text-amber-600">{w.pct}%</span></p>) : <p className="text-brand-muted">None below 50%.</p>}</div>
              <div className="text-sm"><p className="mb-1 text-xs text-brand-muted">Topics to revise</p><div className="flex flex-wrap gap-1.5">{r.revise.map(([t, n]) => <span key={t} className="rounded-full bg-brand-soft px-2.5 py-0.5 text-brand-deep">{t} · {n}</span>)}{!r.revise.length && <span className="text-brand-muted">None logged.</span>}</div></div>
            </Card>))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card><p className="mb-2 text-sm text-brand-muted">Learning hours per day</p><div className="h-56"><ResponsiveContainer><LineChart data={daily}><CartesianGrid stroke="#E3EDE6" /><XAxis dataKey="day" stroke="#7A9487" fontSize={11} /><YAxis stroke="#7A9487" fontSize={11} /><Tooltip {...tip} />{rows.length > 1 && <Legend />}{rows.map((r, i) => <Line key={r.p.id} dataKey={r.p.display_name} stroke={COL[i]} strokeWidth={2} dot={false} />)}</LineChart></ResponsiveContainer></div></Card>
          <Card><p className="mb-2 text-sm text-brand-muted">LeetCode problems per week</p><div className="h-56"><ResponsiveContainer><BarChart data={weekly}><CartesianGrid stroke="#E3EDE6" /><XAxis dataKey="week" stroke="#7A9487" fontSize={11} /><YAxis stroke="#7A9487" fontSize={11} allowDecimals={false} /><Tooltip {...tip} />{rows.length > 1 && <Legend />}{rows.map((r, i) => <Bar key={r.p.id} dataKey={r.p.display_name} fill={COL[i]} radius={[4, 4, 0, 0]} />)}</BarChart></ResponsiveContainer></div></Card>
        </div>
        <Card>
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-brand-ink">Report</h2><Button onClick={download}><Download size={16} />Download .md</Button></div>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-brand-bg p-4 text-sm text-brand-body">{report}</pre>
        </Card>
      </>}
    </Page>)
}
