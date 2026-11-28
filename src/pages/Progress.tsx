import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../services/api'
import { useCtx, useLive } from '../hooks'
import type { Goal, GoalDailyLog, Update, WeeklyTask } from '../lib/types'
import {
  CATS,
  calcLeetCodeStats,
  calcTransformersStats,
  daysAgo,
  fmt,
  isLeetCodeGoal,
  isTransformersGoal,
  summarize,
  thisMonth,
  today,
  weekStart,
} from '../lib/utils'
import Heatmap from '../components/Heatmap'
import { Card, Input, Page, Progress, Stat } from '../components/ui'

export default function ProgressPage() {
  const { uid, profiles } = useCtx()
  const [month, setMonth] = useState(thisMonth())
  const { data: ups } = useLive<Update>('daily_updates', () => api.updates(fmt(daysAgo(104)), today()), [])
  const { data: goalLogs } = useLive<GoalDailyLog>('goal_daily_logs', () => api.goalLogs(), [])
  const { data: goals } = useLive<Goal>('goals', () => api.allGoals(), [])
  const { data: allTasks } = useLive<WeeklyTask>('weekly_tasks', () => api.allTasksAllGoals(), [])

  const isGoalInMonth = (g: Goal) =>
    g.start_date && g.end_date
      ? g.start_date.slice(0, 7) <= month && g.end_date.slice(0, 7) >= month
      : g.month === month

  return (
    <Page
      title="Our Progress"
      sub="Live view of both members. Updates appear instantly."
      right={<Input type="month" className="w-44" value={month} onChange={e => setMonth(e.target.value)} />}
    >
      <div className={`grid gap-6 ${profiles.length > 1 ? 'lg:grid-cols-2' : ''}`}>
        {profiles.map(p => {
          const allUps = ups.filter(u => u.user_id === p.id)
          const allLogs = goalLogs.filter(l => l.user_id === p.id)
          const mUps = allUps.filter(u => u.date.startsWith(month))
          const mLogs = allLogs.filter(l => l.date.startsWith(month))
          const pg = goals.filter(g => g.user_id === p.id && isGoalInMonth(g))
          const pTasks = allTasks.filter(t => t.user_id === p.id)
          const s = summarize(mUps, pg, mLogs, pTasks)

          const hoursByDate: Record<string, number> = {}
          allUps.filter(u => !u.is_draft).forEach(u => {
            hoursByDate[u.date] = (hoursByDate[u.date] ?? 0) + (Number(u.hours) || 0)
          })
          allLogs.filter(l => !l.is_draft).forEach(l => {
            hoursByDate[l.date] = (hoursByDate[l.date] ?? 0) + (Number(l.hours_spent) || 0)
          })
          const heat = Object.fromEntries(
            Object.entries(hoursByDate)
              .filter(([, h]) => h > 0)
              .map(([d, h]) => [d, Math.max(1, Math.min(4, Math.ceil(h)))])
          )

          const cats = Array.from(new Set([...CATS, ...pg.map(g => g.category)]))
          const chart = cats
            .map(c => {
              const gs = pg.filter(g => g.category === c)
              const planned = gs.reduce((a, g) => a + Number(g.target), 0)
              const actual = gs.reduce((a, g) => {
                if (isLeetCodeGoal(g)) return a + calcLeetCodeStats(g, allLogs).completed
                if (isTransformersGoal(g)) {
                  const st = calcTransformersStats(pTasks.filter(t => t.goal_id === g.id))
                  return a + Math.round((st.overallPct * Number(g.target)) / 100)
                }
                return a + Number(g.progress)
              }, 0)
              return { c: c.split(' ')[0], Planned: planned, Actual: actual, n: gs.length }
            })
            .filter(x => x.n)

          const lcGoals = pg.filter(isLeetCodeGoal)
          const trGoals = pg.filter(isTransformersGoal)

          const recentFeed = [
            ...allUps.map(u => ({
              key: `u-${u.date}`,
              date: u.date,
              meta: `${u.hours}h · ${u.leetcode_count} LC`,
              text: u.tasks || u.learned || u.topics.join(', ') || '—',
            })),
            ...allLogs.map(l => ({
              key: `l-${l.id}`,
              date: l.date,
              meta: `${goals.find(g => g.id === l.goal_id)?.title ?? 'Goal'} · ${
                l.questions_solved ? `${l.questions_solved} LC` : `${l.hours_spent}h`
              }`,
              text: l.learning_notes || (l.questions_solved ? `Solved ${l.questions_solved} LeetCode questions` : '—'),
            })),
          ]
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 5)

          return (
            <Card key={p.id} className="space-y-6">
              <h2 className="text-lg font-semibold text-brand-ink">
                {p.id === uid ? `${p.display_name} (you)` : p.display_name}
              </h2>

              <div className="grid grid-cols-4 gap-3">
                <Stat label="Hours" value={s.hours.toFixed(1)} />
                <Stat label="LeetCode" value={s.lc} />
                <Stat label="Active days" value={s.days} />
                <Stat label="Goals done" value={`${s.done}/${s.total}`} />
              </div>

              <div>
                <div className="mb-1.5 flex justify-between text-xs text-brand-muted">
                  <span>Monthly goal progress</span>
                  <span className="tabular-nums">{s.pct}%</span>
                </div>
                <Progress value={s.pct} />
              </div>

              <div>
                <p className="mb-2.5 text-xs text-brand-muted">Contribution calendar (last 15 weeks)</p>
                <Heatmap data={heat} />
              </div>

              <div>
                <p className="mb-2 text-xs text-brand-muted">Planned vs actual</p>
                {chart.length ? (
                  <div className="h-52">
                    <ResponsiveContainer>
                      <BarChart data={chart}>
                        <CartesianGrid stroke="#E3EDE6" />
                        <XAxis dataKey="c" stroke="#7A9487" fontSize={11} />
                        <YAxis stroke="#7A9487" fontSize={11} />
                        <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E3EDE6' }} />
                        <Legend />
                        <Bar dataKey="Planned" fill="#9BD1BD" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Actual" fill="#4F9D91" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-brand-muted">No goals set for this month.</p>
                )}
              </div>

              {!!lcGoals.length && (
                <div className="space-y-3 border-t border-brand-line pt-4">
                  <p className="text-xs text-brand-muted">LeetCode target vs. completed</p>
                  <div className="space-y-2.5">
                    {lcGoals.map(g => {
                      const lc = calcLeetCodeStats(g, allLogs)
                      return (
                        <div key={g.id} className="space-y-1.5">
                          <div className="tabular-nums flex justify-between text-xs">
                            <span className="font-medium text-brand-ink">{g.title}</span>
                            <span className="text-brand-body">
                              {lc.completed}/{lc.target} ({lc.pct}%) · {lc.remaining} remaining
                            </span>
                          </div>
                          <Progress value={lc.pct} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {!!trGoals.length && (
                <div className="space-y-3 border-t border-brand-line pt-4">
                  <p className="text-xs text-brand-muted">Transformers checklist progress</p>
                  {trGoals.map(g => {
                    const tr = calcTransformersStats(pTasks.filter(t => t.goal_id === g.id), weekStart(today()))
                    return (
                      <div key={g.id} className="space-y-2">
                        <div className="tabular-nums flex flex-wrap justify-between gap-2 text-xs">
                          <span className="font-medium text-brand-ink">{g.title}</span>
                          <span className="text-brand-body">
                            Overall {tr.overallPct}% ({tr.done}/{tr.total}) · Week {tr.weekPct}% · {tr.pendingCount} pending
                          </span>
                        </div>
                        <Progress value={tr.overallPct} />
                      </div>
                    )
                  })}
                </div>
              )}

              <div>
                <p className="mb-2 text-xs text-brand-muted">Recent activity</p>
                <div className="space-y-2">
                  {recentFeed.map(item => (
                    <div key={item.key} className="rounded-lg border border-brand-line p-3 text-sm">
                      <div className="flex justify-between text-xs text-brand-muted">
                        <span>{item.date}</span>
                        <span>{item.meta}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-brand-ink">{item.text}</p>
                    </div>
                  ))}
                  {!recentFeed.length && <p className="text-sm text-brand-muted">No updates yet.</p>}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </Page>
  )
}
