import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../services/api'
import { useCtx, useLive } from '../hooks'
import type { Goal, Update } from '../lib/types'
import { CATS, daysAgo, fmt, summarize, thisMonth, today } from '../lib/utils'
import Heatmap from '../components/Heatmap'
import { Card, Input, Page, Progress, Stat } from '../components/ui'

export default function ProgressPage() {
  const { uid, profiles } = useCtx()
  const [month, setMonth] = useState(thisMonth())
  const { data: ups } = useLive<Update>('daily_updates', () => api.updates(fmt(daysAgo(104)), today()), [])
  const { data: goals } = useLive<Goal>('goals', () => api.goals(month), [month])

  return (
    <Page title="Our Progress" sub="Live view of both members. Updates appear instantly."
      right={<Input type="month" className="w-44" value={month} onChange={e => setMonth(e.target.value)} />}>
      <div className="grid gap-6 lg:grid-cols-2">
        {profiles.map(p => {
          const all = ups.filter(u => u.user_id === p.id)
          const mUps = all.filter(u => u.date.startsWith(month))
          const pg = goals.filter(g => g.user_id === p.id)
          const s = summarize(mUps, pg)
          const heat = Object.fromEntries(all.map(u => [u.date, Math.max(1, Math.min(4, Math.ceil(Number(u.hours))))]))
          const chart = CATS.map(c => { const gs = pg.filter(g => g.category === c); return { c: c.split(' ')[0], Planned: gs.reduce((a, g) => a + Number(g.target), 0), Actual: gs.reduce((a, g) => a + Number(g.progress), 0), n: gs.length } }).filter(x => x.n)
          return (
            <Card key={p.id} className="space-y-5">
              <h2 className="text-lg font-semibold text-brand-ink">{p.id === uid ? `${p.display_name} (you)` : p.display_name}</h2>
              <div className="grid grid-cols-4 gap-2"><Stat label="Hours" value={s.hours.toFixed(1)} /><Stat label="LeetCode" value={s.lc} /><Stat label="Active days" value={s.days} /><Stat label="Goals done" value={`${s.done}/${s.total}`} /></div>
              <div><div className="mb-1 flex justify-between text-xs text-brand-muted"><span>Monthly goal progress</span><span>{s.pct}%</span></div><Progress value={s.pct} /></div>
              <div><p className="mb-2 text-xs text-brand-muted">Contribution calendar (last 15 weeks)</p><Heatmap data={heat} /></div>
              <div><p className="mb-2 text-xs text-brand-muted">Planned vs actual</p>
                {chart.length ? <div className="h-48"><ResponsiveContainer><BarChart data={chart}><CartesianGrid stroke="#E3EDE6" /><XAxis dataKey="c" stroke="#7A9487" fontSize={11} /><YAxis stroke="#7A9487" fontSize={11} /><Tooltip contentStyle={{ background: '#fff', border: '1px solid #E3EDE6' }} /><Legend /><Bar dataKey="Planned" fill="#9BD1BD" radius={[4, 4, 0, 0]} /><Bar dataKey="Actual" fill="#4F9D91" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <p className="text-sm text-brand-muted">No goals set for this month.</p>}</div>
              <div><p className="mb-2 text-xs text-brand-muted">Recent activity</p>
                <div className="space-y-2">{all.slice(0, 5).map(u => (
                  <div key={u.date} className="rounded-lg border border-brand-line p-3 text-sm"><div className="flex justify-between text-xs text-brand-muted"><span>{u.date}</span><span>{u.hours}h · {u.leetcode_count} LC</span></div>
                    <p className="mt-1 line-clamp-2 text-brand-ink">{u.tasks || u.topics.join(', ') || '—'}</p></div>))}
                  {!all.length && <p className="text-sm text-brand-muted">No updates yet.</p>}</div></div>
            </Card>)
        })}
      </div>
    </Page>)
}
