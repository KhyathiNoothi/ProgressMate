import type { Goal, GoalDailyLog, GoalType, Update, WeeklyTask } from './types'

export const cn = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ')
export const CATS = ['DSA', 'LeetCode', 'Transformers', 'GenAI', 'Practical Implementation']
const p2 = (n: number) => String(n).padStart(2, '0')
export const fmt = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
export const today = () => fmt(new Date())
export const thisMonth = () => today().slice(0, 7)
export const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d }
export const monthRange = (m: string) => { const [y, mo] = m.split('-').map(Number); const days = new Date(y, mo, 0).getDate(); return { start: `${m}-01`, end: `${m}-${p2(days)}`, days } }
export const elapsedDays = (m: string) => (m === thisMonth() ? new Date().getDate() : monthRange(m).days)
export const goalPct = (g: Goal) => Math.min(100, Math.round((Number(g.progress) / Math.max(1, Number(g.target))) * 100))

export const getGoalType = (g: Pick<Goal, 'goal_type' | 'category'>): GoalType => {
  if (g.goal_type === 'leetcode' || g.goal_type === 'transformers') return g.goal_type
  if (/leetcode/i.test(g.category)) return 'leetcode'
  if (/transformer/i.test(g.category)) return 'transformers'
  return 'general'
}
export const isLeetCodeGoal = (g: Pick<Goal, 'goal_type' | 'category'>) => getGoalType(g) === 'leetcode'
export const isTransformersGoal = (g: Pick<Goal, 'goal_type' | 'category'>) => getGoalType(g) === 'transformers'

/** Calculates LeetCode goal progress strictly from goal-linked non-draft daily logs. */
export function calcLeetCodeStats(goal: Goal, logs: GoalDailyLog[]) {
  const goalLogs = logs.filter(l => l.goal_id === goal.id && !l.is_draft)
  const completed = goalLogs.reduce((a, l) => a + Math.max(0, Number(l.questions_solved) || 0), 0)
  const target = Math.max(1, Math.round(Number(goal.target) || 1))
  const remaining = Math.max(0, target - completed)
  const pct = Math.min(100, Math.round((completed / target) * 100))
  const status: Goal['status'] = completed >= target ? 'completed' : completed > 0 ? 'in_progress' : 'not_started'
  const hours = goalLogs.reduce((a, l) => a + Math.max(0, Number(l.hours_spent) || 0), 0)
  return { completed, target, remaining, pct, status, hours, logs: goalLogs }
}

/** Calculates Transformers goal progress strictly from actual checklist tasks. */
export function calcTransformersStats(tasks: WeeklyTask[], activeWeek?: string) {
  const total = tasks.length
  const done = tasks.filter(t => t.is_done).length
  const overallPct = total ? Math.round((done / total) * 100) : 0
  const pending = tasks.filter(t => !t.is_done)
  const status: Goal['status'] = total > 0 && done === total ? 'completed' : done > 0 ? 'in_progress' : 'not_started'

  const weekTasks = activeWeek ? tasks.filter(t => t.week_start === activeWeek) : []
  const weekDone = weekTasks.filter(t => t.is_done).length
  const weekTotal = weekTasks.length
  const weekPct = weekTotal ? Math.round((weekDone / weekTotal) * 100) : 0

  const weekMap = new Map<string, { completed: number; pending: number; total: number }>()
  tasks.forEach(t => {
    const cur = weekMap.get(t.week_start) ?? { completed: 0, pending: 0, total: 0 }
    cur.total += 1
    if (t.is_done) cur.completed += 1
    else cur.pending += 1
    weekMap.set(t.week_start, cur)
  })
  const weeklyBreakdown = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, v]) => ({
      week_start: week,
      week: week.slice(5),
      completed: v.completed,
      pending: v.pending,
      total: v.total,
      pct: v.total ? Math.round((v.completed / v.total) * 100) : 0,
    }))

  return {
    total,
    done,
    pending,
    pendingCount: pending.length,
    overallPct,
    status,
    weekTasks,
    weekDone,
    weekTotal,
    weekPending: weekTasks.filter(t => !t.is_done),
    weekPct,
    weeklyBreakdown,
  }
}

/** Computes live goal percentage from linked records when applicable, preserving manual % for general goals. */
export function liveGoalPct(g: Goal, logs: GoalDailyLog[], tasks: WeeklyTask[]): number {
  const kind = getGoalType(g)
  if (kind === 'leetcode') return calcLeetCodeStats(g, logs).pct
  if (kind === 'transformers') return calcTransformersStats(tasks.filter(t => t.goal_id === g.id)).overallPct
  return goalPct(g)
}

export function liveGoalStatus(g: Goal, logs: GoalDailyLog[], tasks: WeeklyTask[]): Goal['status'] {
  const kind = getGoalType(g)
  if (kind === 'leetcode') return calcLeetCodeStats(g, logs).status
  if (kind === 'transformers') return calcTransformersStats(tasks.filter(t => t.goal_id === g.id)).status
  return g.status
}

/** Summarizes general updates + goal-linked daily logs without double-counting hours, LeetCode, or active days. */
export function summarize(u: Update[], g: Goal[], goalLogs: GoalDailyLog[] = [], tasks: WeeklyTask[] = []) {
  const nonDraftUpdates = u.filter(x => !x.is_draft)
  const nonDraftLogs = goalLogs.filter(x => !x.is_draft)
  const generalHours = nonDraftUpdates.reduce((a, x) => a + Math.max(0, Number(x.hours) || 0), 0)
  const goalHours = nonDraftLogs.reduce((a, x) => a + Math.max(0, Number(x.hours_spent) || 0), 0)
  const generalLc = nonDraftUpdates.reduce((a, x) => a + Math.max(0, Number(x.leetcode_count) || 0), 0)
  const goalLc = nonDraftLogs.reduce((a, x) => a + Math.max(0, Number(x.questions_solved) || 0), 0)

  const activeDates = new Set<string>([
    ...nonDraftUpdates.map(x => x.date),
    ...nonDraftLogs.map(x => x.date),
  ])

  const pct = g.length
    ? Math.round(g.reduce((a, x) => a + liveGoalPct(x, nonDraftLogs, tasks), 0) / g.length)
    : 0
  const done = g.filter(x => liveGoalStatus(x, nonDraftLogs, tasks) === 'completed').length

  return {
    hours: generalHours + goalHours,
    generalHours,
    goalHours,
    lc: generalLc + goalLc,
    generalLc,
    goalLc,
    days: activeDates.size,
    done,
    total: g.length,
    pct,
  }
}

const ymd = (s: string) => s.split('-').map(Number)
export const addDays = (s: string, n: number) => { const [y, m, d] = ymd(s); return fmt(new Date(y, m - 1, d + n)) }
export const weekStart = (s: string) => { const [y, m, d] = ymd(s); return addDays(s, -((new Date(y, m - 1, d).getDay() + 6) % 7)) }
export const fmtD = (s: string) => { const [y, m, d] = ymd(s); return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
export const daysBetween = (a: string, b: string) => Math.round((+new Date(b) - +new Date(a)) / 864e5)
