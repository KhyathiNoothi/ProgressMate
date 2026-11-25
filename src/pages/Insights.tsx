import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../services/api'
import { useCtx, useLive } from '../hooks'
import type { Goal, Update } from '../lib/types'
import { CATS, elapsedDays, goalPct, monthRange, summarize, thisMonth } from '../lib/utils'
import { Button, Card, Input, Page, Stat } from '../components/ui'

export default function Insights() {
  const { uid, profiles } = useCtx()
  const [month, setMonth] = useState(thisMonth()); const [sel, setSel] = useState(uid)
  const r = monthRange(month)
  const { data: ups } = useLive<Update>('daily_updates', () => api.updates(r.start, r.end), [month])
  const { data: goals } = useLive<Goal>('goals', () => api.goals(month), [month])
  const name = profiles.find(p => p.id === sel)?.display_name ?? ''

  const d = useMemo(() => {
    const u = ups.filter(x => x.user_id === sel).sort((a, b) => a.date.localeCompare(b.date))
    const g = goals.filter(x => x.user_id === sel)
    const s = summarize(u, g); const el = elapsedDays(month)
    const consistency = Math.round((s.days / el) * 100)
    const daily = u.map(x => ({ day: x.date.slice(8), Hours: Number(x.hours) }))
    const weeks = [1, 2, 3, 4, 5].map(w => ({ week: `W${w}`, Problems: u.filter(x => Math.ceil(+x.date.slice(8) / 7) === w).reduce((a, x) => a + x.leetcode_count, 0) }))
    const weak = CATS.map(c => { const gs = g.filter(x => x.category === c); return { c, pct: gs.length ? Math.round(gs.reduce((a, x) => a + goalPct(x), 0) / gs.length) : null } }).filter(x => x.pct !== null && x.pct < 50).sort((a, b) => a.pct! - b.pct!)
    const rev: Record<string, number> = {}
    u.filter(x => x.challenges.trim()).forEach(x => x.topics.forEach(t => (rev[t] = (rev[t] ?? 0) + 1)))
    const revise = Object.entries(rev).sort((a, b) => b[1] - a[1])
    const best = u.reduce((m, x) => Math.max(m, x.leetcode_count), 0)
    return { u, g, s, el, consistency, daily, weeks, weak, revise, best }
  }, [ups, goals, sel, month])

  const report = `# Monthly Progress Report – ${name} – ${month}

## Summary
- Study hours: ${d.s.hours.toFixed(1)}
- Active days: ${d.s.days}/${d.el} (${d.consistency}% consistency)
- LeetCode problems solved: ${d.s.lc} (best day: ${d.best})
- Goals completed: ${d.s.done}/${d.s.total} (overall progress ${d.s.pct}%)

## Goals
${d.g.map(g => `- [${g.status === 'completed' ? 'x' : ' '}] ${g.category}: ${g.title} – ${g.progress}/${g.target} ${g.unit} (${goalPct(g)}%)${g.deadline ? `, due ${g.deadline}` : ''}`).join('\n') || '- No goals set'}

## Weak areas (below 50% of target)
${d.weak.map(w => `- ${w.c}: ${w.pct}%`).join('\n') || '- None'}

## Topics to revise (studied on days with challenges)
${d.revise.map(([t, n]) => `- ${t} (${n}x)`).join('\n') || '- None'}
`
  const download = () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([report], { type: 'text/markdown' }))
    a.download = `progress-report-${name}-${month}.md`; a.click(); URL.revokeObjectURL(a.href)
  }
  const tip = { contentStyle: { background: '#0f1630', border: '1px solid #ffffff20' } }

  return (
    <Page title="Insights & Reports" sub="Computed live from your stored updates and goals."
      right={<div className="flex gap-2"><Input type="month" className="w-44" value={month} onChange={e => setMonth(e.target.value)} />
        {profiles.map(p => <Button key={p.id} variant={p.id === sel ? undefined : 'ghost'} onClick={() => setSel(p.id)}>{p.id === uid ? 'Me' : p.display_name}</Button>)}</div>}>
      <Card className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Stat label="Consistency" value={`${d.consistency}%`} /><Stat label="Hours" value={d.s.hours.toFixed(1)} />
        <Stat label="LeetCode solved" value={d.s.lc} /><Stat label="Completed goals" value={d.s.done} /><Stat label="Pending goals" value={d.s.total - d.s.done} />
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><p className="mb-2 text-sm text-slate-400">Learning hours per day</p><div className="h-56"><ResponsiveContainer><LineChart data={d.daily}><CartesianGrid stroke="#ffffff14" /><XAxis dataKey="day" stroke="#94a3b8" fontSize={11} /><YAxis stroke="#94a3b8" fontSize={11} /><Tooltip {...tip} /><Line dataKey="Hours" stroke="#a855f7" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div></Card>
        <Card><p className="mb-2 text-sm text-slate-400">LeetCode / DSA problems per week</p><div className="h-56"><ResponsiveContainer><BarChart data={d.weeks}><CartesianGrid stroke="#ffffff14" /><XAxis dataKey="week" stroke="#94a3b8" fontSize={11} /><YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} /><Tooltip {...tip} /><Bar dataKey="Problems" fill="#3b82f6" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
        <Card><p className="mb-2 font-semibold text-white">Weak areas</p>{d.weak.length ? d.weak.map(w => <p key={w.c} className="text-sm">{w.c} — <span className="text-amber-300">{w.pct}%</span> of target</p>) : <p className="text-sm text-slate-500">No category below 50%.</p>}</Card>
        <Card><p className="mb-2 font-semibold text-white">Topics that need revision</p>{d.revise.length ? <div className="flex flex-wrap gap-2">{d.revise.map(([t, n]) => <span key={t} className="rounded-full bg-purple-500/20 px-3 py-1 text-sm">{t} · {n}</span>)}</div> : <p className="text-sm text-slate-500">Topics logged on days with challenges will show here.</p>}</Card>
      </div>
      <Card>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-white">Monthly report</h2><Button onClick={download}><Download size={16} />Download .md</Button></div>
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-navy-900 p-4 text-sm text-slate-300">{report}</pre>
      </Card>
    </Page>)
}
