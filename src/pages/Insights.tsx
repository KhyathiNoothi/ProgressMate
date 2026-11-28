import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../services/api'
import { useCtx, useLive } from '../hooks'
import type { Goal, GoalDailyLog, Update, WeeklyTask } from '../lib/types'
import {
  CATS,
  addDays,
  calcLeetCodeStats,
  calcTransformersStats,
  daysBetween,
  fmtD,
  isLeetCodeGoal,
  isTransformersGoal,
  liveGoalPct,
  liveGoalStatus,
  summarize,
  thisMonth,
  today,
  weekStart,
} from '../lib/utils'
import { Badge, Button, Card, Field, Input, Page, Progress, Select, Stat } from '../components/ui'

type Preset = '7' | '30' | 'month' | 'custom'
const COL = ['#4F9D91', '#D9A66B']
const PRESETS: [Preset, string][] = [
  ['7', 'Last 7 days'],
  ['30', 'Last 30 days'],
  ['month', 'This month'],
  ['custom', 'Custom range'],
]

export default function Insights() {
  const { uid, profiles } = useCtx()
  const [preset, setPreset] = useState<Preset>('month')
  const [from, setFrom] = useState(thisMonth() + '-01')
  const [to, setTo] = useState(today())
  const [scope, setScope] = useState(uid)
  const valid = !!from && !!to && from <= to && daysBetween(from, to) < 366

  const apply = (p: Preset) => {
    setPreset(p)
    if (p === '7') {
      setFrom(addDays(today(), -6))
      setTo(today())
    }
    if (p === '30') {
      setFrom(addDays(today(), -29))
      setTo(today())
    }
    if (p === 'month') {
      setFrom(thisMonth() + '-01')
      setTo(today())
    }
  }

  const { data: ups } = useLive<Update>(
    'daily_updates',
    () => (valid ? api.updates(from, to) : Promise.resolve([])),
    [from, to, valid]
  )
  const { data: goalLogs } = useLive<GoalDailyLog>('goal_daily_logs', () => api.goalLogs(), [])
  const { data: goals } = useLive<Goal>('goals', () => api.allGoals(), [])
  const { data: tasks } = useLive<WeeklyTask>('weekly_tasks', () => api.allTasksAllGoals(), [])

  const members = scope === 'all' ? profiles : profiles.filter(p => p.id === scope)

  const rows = useMemo(
    () =>
      members.map(p => {
        const u = ups
          .filter(x => x.user_id === p.id && !x.is_draft)
          .sort((a, b) => a.date.localeCompare(b.date))
        const allUserLogs = goalLogs.filter(x => x.user_id === p.id && !x.is_draft)
        const rangeLogs = allUserLogs
          .filter(x => x.date >= from && x.date <= to)
          .sort((a, b) => a.date.localeCompare(b.date))
        const g = goals.filter(x => {
          if (x.user_id !== p.id) return false
          const gs = x.start_date ?? `${x.month}-01`
          const ge = x.end_date ?? `${x.month}-31`
          return gs <= to && ge >= from
        })
        const t = tasks.filter(x => x.user_id === p.id)
        const rangeTasks = t.filter(x => x.week_start >= weekStart(from) && x.week_start <= to)

        const s = summarize(u, g, rangeLogs, t)
        const el = Math.max(1, daysBetween(from, to < today() ? to : today()) + 1)

        const allCats = CATS.concat(g.map(x => x.category)).filter((c, i, a) => a.indexOf(c) === i)
        const weak = allCats
          .map(c => {
            const gs = g.filter(x => x.category === c)
            return {
              c,
              pct: gs.length ? Math.round(gs.reduce((a, x) => a + liveGoalPct(x, allUserLogs, t), 0) / gs.length) : null,
            }
          })
          .filter(x => x.pct !== null && x.pct < 50)

        const rev: Record<string, number> = {}
        u.filter(x => x.challenges.trim()).forEach(x =>
          x.topics.forEach(tp => (rev[tp] = (rev[tp] ?? 0) + 1))
        )

        const lcDetails = g.filter(isLeetCodeGoal).map(goal => ({
          goal,
          ...calcLeetCodeStats(goal, allUserLogs),
        }))

        const trDetails = g.filter(isTransformersGoal).map(goal => ({
          goal,
          ...calcTransformersStats(
            t.filter(x => x.goal_id === goal.id),
            weekStart(today())
          ),
        }))

        const notes = [
          ...u
            .filter(x => (x.learned ?? '').trim())
            .map(x => ({
              id: `u-${x.date}`,
              date: x.date,
              source: 'General Update',
              hours: Number(x.hours) || 0,
              note: x.learned!.trim(),
            })),
          ...rangeLogs
            .filter(l => l.learning_notes.trim())
            .map(l => ({
              id: `l-${l.id}`,
              date: l.date,
              source: goals.find(x => x.id === l.goal_id)?.title ?? 'Goal',
              hours: Number(l.hours_spent) || 0,
              note: l.learning_notes.trim(),
            })),
        ].sort((a, b) => b.date.localeCompare(a.date))

        return {
          p,
          u,
          rangeLogs,
          allUserLogs,
          g,
          t,
          s,
          consistency: Math.min(100, Math.round((s.days / el) * 100)),
          tDone: rangeTasks.filter(x => x.is_done).length,
          tTotal: rangeTasks.length,
          weak,
          revise: Object.entries(rev).sort((a, b) => b[1] - a[1]),
          lcDetails,
          trDetails,
          notes,
        }
      }),
    [ups, goalLogs, goals, tasks, scope, from, to, profiles]
  )

  const days = useMemo(() => {
    const a: string[] = []
    if (valid) for (let d = from; d <= to; d = addDays(d, 1)) a.push(d)
    return a
  }, [from, to, valid])

  const weeklyLeetCode = Array.from(new Set<string>(days.map(d => weekStart(d)))).map((w: string) => {
    const o: any = { week: w.slice(5) }
    rows.forEach(r => {
      const genQ = r.u.filter(x => weekStart(x.date) === w).reduce((a, x) => a + (x.leetcode_count || 0), 0)
      const goalQ = r.rangeLogs.filter(x => weekStart(x.date) === w).reduce((a, x) => a + (x.questions_solved || 0), 0)
      o[r.p.display_name] = genQ + goalQ
    })
    return o
  })

  const lcTargetChart = rows.flatMap(r =>
    r.lcDetails.map(d => ({
      name: rows.length > 1 ? `${d.goal.title} (${r.p.display_name.split(' ')[0]})` : d.goal.title,
      Target: d.target,
      Completed: d.completed,
    }))
  )

  const pctT = (r: { tDone: number; tTotal: number }) => (r.tTotal ? Math.round((r.tDone / r.tTotal) * 100) : 0)

  const report = valid
    ? `# Progress Report: ${fmtD(from)} to ${fmtD(to)}\n\n` +
      rows
        .map(
          r => `## ${r.p.display_name}

### Summary
- Study hours (no double-counting): ${r.s.hours.toFixed(1)}h (General: ${r.s.generalHours.toFixed(1)}h, Goal-linked: ${r.s.goalHours.toFixed(1)}h)
- Active days: ${r.s.days} (${r.consistency}% consistency)
- LeetCode problems solved in range: ${r.s.lc}
- Goals completed: ${r.s.done}/${r.s.total}
- Weekly tasks completed in range: ${r.tDone}/${r.tTotal} (${pctT(r)}%)

### LeetCode Goals (Target vs. Completed)
${
  r.lcDetails
    .map(d => `- ${d.goal.title}: ${d.completed}/${d.target} solved (${d.pct}%), ${d.remaining} remaining`)
    .join('\n') || '- None'
}

### Transformers Learning Goals
${
  r.trDetails
    .map(
      d =>
        `- ${d.goal.title}: ${d.done}/${d.total} tasks completed (${d.overallPct}%), ${d.pendingCount} pending\n` +
        (d.pending.length
          ? d.pending.map(pt => `  - Pending (${pt.week_start}): ${pt.title}`).join('\n')
          : '  - All tasks completed')
    )
    .join('\n') || '- None'
}

### Completed goals
${
  r.g
    .filter(x => liveGoalStatus(x, r.allUserLogs, r.t) === 'completed')
    .map(x => `- ${x.title} (${x.category})`)
    .join('\n') || '- None'
}

### Pending goals
${
  r.g
    .filter(x => liveGoalStatus(x, r.allUserLogs, r.t) !== 'completed')
    .map(x => `- ${x.title} (${x.category}): ${liveGoalPct(x, r.allUserLogs, r.t)}%, due ${fmtD(x.end_date!)}`)
    .join('\n') || '- None'
}

### Weak areas (below 50% of target)
${r.weak.map(w => `- ${w.c}: ${w.pct}%`).join('\n') || '- None'}

### Topics to revise
${r.revise.map(([t, n]) => `- ${t} (${n}x)`).join('\n') || '- None'}

### Learning Notes (Separate Tracking)
${r.notes.map(n => `- ${n.date} [${n.source}${n.hours ? `, ${n.hours}h` : ''}]: ${n.note.replace(/\n/g, ' ')}`).join('\n') || '- None'}

### Daily updates
${r.u.map(x => `- ${x.date} (${x.hours}h): ${(x.completed || x.tasks || x.worked_on || '').replace(/\n/g, ' ').slice(0, 160)}`).join('\n') || '- None'}
`
        )
        .join('\n')
    : ''

  const download = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([report], { type: 'text/markdown' }))
    a.download = `progress-report-${from}_to_${to}.md`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const tip = { contentStyle: { background: '#fff', border: '1px solid #E3EDE6' } }

  return (
    <Page
      title="Reports & Analytics"
      sub="Pick any date range. Only data inside it is included."
    >
      <Card className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(([k, l]) => (
            <Button key={k} variant={preset === k ? undefined : 'ghost'} onClick={() => apply(k)}>
              {l}
            </Button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Start date">
            <Input
              type="date"
              value={from}
              onChange={e => {
                setFrom(e.target.value)
                setPreset('custom')
              }}
            />
          </Field>
          <Field label="End date">
            <Input
              type="date"
              value={to}
              onChange={e => {
                setTo(e.target.value)
                setPreset('custom')
              }}
            />
          </Field>
          <Field label="Report for">
            <Select value={scope} onChange={e => setScope(e.target.value)}>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.id === uid ? 'Me' : p.display_name}
                </option>
              ))}
              <option value="all">Combined workspace</option>
            </Select>
          </Field>
        </div>
        {!valid && (
          <p className="text-sm text-red-500">
            Choose a start date on or before the end date (max 366 days).
          </p>
        )}
        {valid && (
          <p className="text-sm text-brand-muted">
            {fmtD(from)} to {fmtD(to)} · {days.length} days
          </p>
        )}
      </Card>

      {valid && (
        <>
          <div className={`grid gap-6 ${rows.length > 1 ? 'lg:grid-cols-2' : ''}`}>
            {rows.map(r => (
              <Card key={r.p.id} className="space-y-5">
                <h2 className="text-lg font-semibold text-brand-ink">
                  {r.p.id === uid ? `${r.p.display_name} (you)` : r.p.display_name}
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  <Stat label="Hours" value={r.s.hours.toFixed(1)} />
                  <Stat label="Active days" value={r.s.days} />
                  <Stat label="Consistency" value={`${r.consistency}%`} />
                  <Stat label="LeetCode" value={r.s.lc} />
                  <Stat label="Goals done" value={`${r.s.done}/${r.s.total}`} />
                  <Stat label="Weekly tasks" value={`${pctT(r)}%`} />
                </div>

                {!!r.lcDetails.length && (
                  <div className="space-y-2 border-t border-brand-line pt-4">
                    <p className="text-xs text-brand-muted">LeetCode goals</p>
                    {r.lcDetails.map(d => (
                      <div key={d.goal.id} className="space-y-1">
                        <div className="tabular-nums flex justify-between text-xs">
                          <span className="font-medium text-brand-ink">{d.goal.title}</span>
                          <span className="text-brand-body">
                            {d.completed}/{d.target} ({d.pct}%) · {d.remaining} left
                          </span>
                        </div>
                        <Progress value={d.pct} />
                      </div>
                    ))}
                  </div>
                )}

                {!!r.trDetails.length && (
                  <div className="space-y-2 border-t border-brand-line pt-4">
                    <p className="text-xs text-brand-muted">Transformers & pending tasks</p>
                    {r.trDetails.map(d => (
                      <div key={d.goal.id} className="space-y-1.5 rounded-lg border border-brand-line p-3">
                        <div className="tabular-nums flex justify-between text-xs">
                          <span className="font-medium text-brand-ink">{d.goal.title}</span>
                          <span className="text-brand-deep">
                            {d.done}/{d.total} ({d.overallPct}%) · {d.pendingCount} pending
                          </span>
                        </div>
                        <Progress value={d.overallPct} />
                        {!!d.pending.length && (
                          <div className="pt-1 text-xs text-brand-body">
                            {d.pending.slice(0, 4).map(pt => (
                              <p key={pt.id} className="truncate">
                                • {pt.title} <span className="text-brand-muted">({pt.week_start})</span>
                              </p>
                            ))}
                            {d.pending.length > 4 && (
                              <p className="text-[11px] text-brand-muted">+{d.pending.length - 4} more pending</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-sm">
                  <p className="text-xs text-brand-muted">Weak areas</p>
                  {r.weak.length ? (
                    r.weak.map(w => (
                      <p key={w.c}>
                        {w.c}: <span className="text-amber-600">{w.pct}%</span>
                      </p>
                    ))
                  ) : (
                    <p className="text-brand-muted">None below 50%.</p>
                  )}
                </div>

                <div className="text-sm">
                  <p className="mb-1 text-xs text-brand-muted">Topics to revise</p>
                  <div className="flex flex-wrap gap-1.5">
                    {r.revise.map(([t, n]) => (
                      <Badge key={t} tone="mint">
                        {t} · {n}
                      </Badge>
                    ))}
                    {!r.revise.length && <span className="text-brand-muted">None logged.</span>}
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-xs text-brand-muted">Learning notes ({r.notes.length})</p>
                  <div className="max-h-36 space-y-1.5 overflow-y-auto">
                    {r.notes.map(n => (
                      <div key={n.id} className="rounded-lg border border-brand-line p-2.5 text-xs">
                        <p className="tabular-nums font-medium text-brand-ink">
                          {fmtD(n.date)} · {n.source}
                          {n.hours ? ` · ${n.hours}h` : ''}
                        </p>
                        <p className="mt-0.5 text-brand-body">{n.note}</p>
                      </div>
                    ))}
                    {!r.notes.length && <p className="text-xs text-brand-muted">No learning notes in range.</p>}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <p className="mb-2 text-sm text-brand-muted">LeetCode problems per week</p>
              <div className="h-56">
                <ResponsiveContainer>
                  <BarChart data={weeklyLeetCode}>
                    <CartesianGrid stroke="#E3EDE6" />
                    <XAxis dataKey="week" stroke="#7A9487" fontSize={11} />
                    <YAxis stroke="#7A9487" fontSize={11} allowDecimals={false} />
                    <Tooltip {...tip} />
                    {rows.length > 1 && <Legend />}
                    {rows.map((r, i) => (
                      <Bar key={r.p.id} dataKey={r.p.display_name} fill={COL[i]} radius={[4, 4, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <p className="mb-2 text-sm text-brand-muted">LeetCode target vs. completed</p>
              {lcTargetChart.length ? (
                <div className="h-56">
                  <ResponsiveContainer>
                    <BarChart data={lcTargetChart}>
                      <CartesianGrid stroke="#E3EDE6" />
                      <XAxis dataKey="name" stroke="#7A9487" fontSize={11} />
                      <YAxis stroke="#7A9487" fontSize={11} allowDecimals={false} />
                      <Tooltip {...tip} />
                      <Legend />
                      <Bar dataKey="Target" fill="#9BD1BD" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Completed" fill="#4F9D91" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-brand-muted">No active LeetCode goals in this date range.</p>
              )}
            </Card>
          </div>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-brand-ink">Report</h2>
              <Button onClick={download}>
                <Download size={16} />
                Download .md
              </Button>
            </div>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-brand-bg p-4 text-sm text-brand-body">
              {report}
            </pre>
          </Card>
        </>
      )}
    </Page>
  )
}
