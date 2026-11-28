import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Calendar, ChevronDown, ChevronUp, Code2, Cpu, Pencil, Plus, Target, Trash2, X } from 'lucide-react'
import { api } from '../services/api'
import { useCtx, useLive } from '../hooks'
import type { Category, Goal, GoalDailyLog, GoalType, WeeklyTask } from '../lib/types'
import {
  CATS,
  addDays,
  calcLeetCodeStats,
  calcTransformersStats,
  daysBetween,
  fmtD,
  getGoalType,
  isLeetCodeGoal,
  isTransformersGoal,
  liveGoalPct,
  liveGoalStatus,
  today,
} from '../lib/utils'
import {
  Badge,
  Button,
  Card,
  CelebrationBanner,
  Field,
  Input,
  Page,
  Progress,
  Select,
  Stat,
  Textarea,
  Tilt3DCard,
} from '../components/ui'
import WeeklyTasks from '../components/WeeklyTasks'
import TransformersTracker from '../components/TransformersTracker'

const blank = () => ({
  id: undefined as string | undefined,
  title: '',
  description: '',
  category: '',
  goal_type: 'general' as GoalType,
  target: '100',
  start_date: today(),
  end_date: '',
  priority: 'medium',
})

const pri = {
  high: 'text-red-600 bg-red-50',
  medium: 'text-amber-600 bg-amber-50',
  low: 'text-emerald-600 bg-emerald-50',
}
const statusOf = (p: number): Goal['status'] => (p >= 100 ? 'completed' : p > 0 ? 'in_progress' : 'not_started')
const dueIn = (g: Goal) => daysBetween(today(), g.end_date!)

function ScheduleStrip({
  goals,
  logs,
  tasks,
}: {
  goals: Goal[]
  logs: GoalDailyLog[]
  tasks: WeeklyTask[]
}) {
  const [open, setOpen] = useState(true)
  if (!goals.length) return null
  const min = goals.reduce((m, g) => (g.start_date! < m ? g.start_date! : m), goals[0].start_date!)
  const max = goals.reduce((m, g) => (g.end_date! > m ? g.end_date! : m), goals[0].end_date!)
  const span = Math.max(1, daysBetween(min, max) + 1)
  const pos = (d: string) => (daysBetween(min, d) / span) * 100
  const t = today()
  const barCol = { completed: 'bg-[#9BD1BD]', in_progress: 'bg-[#4F9D91]', not_started: 'bg-[#C8E9D8]' }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-brand-deep" />
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-body">Timeline</span>
          <span className="tabular-nums text-xs text-brand-muted">
            {fmtD(min)} – {fmtD(max)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-brand-muted hover:bg-brand-bg hover:text-brand-ink"
        >
          {open ? 'Hide' : 'Show'}
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-2 border-t border-brand-line pt-3">
          {goals.map(g => {
            const st = liveGoalStatus(g, logs, tasks.filter(tk => tk.goal_id === g.id))
            const over = st !== 'completed' && g.end_date! < t
            const leftPct = Math.max(0, Math.min(97, pos(g.start_date!)))
            const widthPct = Math.max(3, Math.min(100 - leftPct, ((daysBetween(g.start_date!, g.end_date!) + 1) / span) * 100))
            return (
              <div key={g.id} className="grid grid-cols-[120px_1fr_64px] items-center gap-3 sm:grid-cols-[180px_1fr_76px]">
                <span className="truncate text-xs font-medium text-brand-ink" title={g.title}>
                  {g.title}
                </span>
                <div className="relative h-2.5 rounded-full bg-brand-soft/80">
                  {t >= min && t <= max && (
                    <div
                      className="absolute -top-0.5 bottom-0 z-10 h-3.5 w-[1.5px] bg-brand-deep"
                      style={{ left: `${pos(t)}%` }}
                      title="Today"
                    />
                  )}
                  <div
                    className={`absolute top-0 h-2.5 rounded-full transition-all ${over ? 'bg-red-300' : barCol[st]}`}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    title={`${g.title}: ${fmtD(g.start_date!)} to ${fmtD(g.end_date!)}`}
                  />
                </div>
                <span className={`tabular-nums text-right text-[11px] ${over ? 'font-medium text-red-600' : 'text-brand-muted'}`}>
                  {st === 'completed' ? 'Done' : over ? 'Overdue' : `${dueIn(g)}d left`}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

export default function Goals() {
  const { uid, profiles } = useCtx()
  const { data: goals, reload } = useLive<Goal>('goals', () => api.allGoals(), [])
  const { data: cats, reload: reloadCats } = useLive<Category>('categories', () => api.categories(), [])
  const { data: goalLogs } = useLive<GoalDailyLog>('goal_daily_logs', () => api.goalLogs(), [])
  const { data: allTasks } = useLive<WeeklyTask>('weekly_tasks', () => api.allTasksAllGoals(), [])

  const names = cats.length ? cats.map(c => c.name) : CATS
  const [f, setF] = useState(blank())
  const [modalOpen, setModalOpen] = useState(false)
  const [newCat, setNewCat] = useState('')
  const [err, setErr] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'due' | 'overdue'>('all')
  const [memberTab, setMemberTab] = useState<'all' | string>('all')
  const [celebrate, setCelebrate] = useState<string | null>(null)

  const cat = f.category || names[0]

  useEffect(() => {
    if (!modalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalOpen])

  useEffect(() => {
    if (!celebrate) return
    const t = setTimeout(() => setCelebrate(null), 4000)
    return () => clearTimeout(t)
  }, [celebrate])

  const mineGoals = goals.filter(g => g.user_id === uid)
  const isOver = (g: Goal) =>
    liveGoalStatus(g, goalLogs, allTasks.filter(t => t.goal_id === g.id)) !== 'completed' && g.end_date! < today()
  const isDueSoon = (g: Goal) =>
    liveGoalStatus(g, goalLogs, allTasks.filter(t => t.goal_id === g.id)) !== 'completed' &&
    dueIn(g) >= 0 &&
    dueIn(g) <= 14
  const isDone = (g: Goal) =>
    liveGoalStatus(g, goalLogs, allTasks.filter(t => t.goal_id === g.id)) === 'completed'

  const overdueCount = mineGoals.filter(isOver).length
  const dueSoonCount = mineGoals.filter(isDueSoon).length
  const completedCount = mineGoals.filter(isDone).length
  const activeCount = mineGoals.length - completedCount

  const openNewModal = () => {
    setF(blank())
    setErr('')
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setErr('')
  }

  const pickGoalType = (gt: GoalType) => {
    const lcCat = names.find(n => /leetcode/i.test(n)) ?? 'LeetCode'
    const trCat = names.find(n => /transformer/i.test(n)) ?? 'Transformers'
    setF(prev => ({
      ...prev,
      goal_type: gt,
      category: gt === 'leetcode' ? lcCat : gt === 'transformers' ? trCat : prev.category || names[0],
      target: gt === 'leetcode' ? (prev.goal_type === 'leetcode' ? prev.target : '100') : '100',
    }))
  }

  const addCat = async () => {
    const name = newCat.trim()
    if (!name) return
    await api.addCategories([...(cats.length ? [] : CATS), name])
    setF({ ...f, category: name })
    setNewCat('')
    reloadCats()
  }

  const save = async () => {
    if (!f.title.trim()) return setErr('Add a goal name')
    if (!f.end_date) return setErr('Pick a target date')
    if (f.end_date < f.start_date) return setErr('Target date must be on or after the start date')
    const targetNum = Number(f.target)
    if (f.goal_type === 'leetcode' && (!Number.isFinite(targetNum) || targetNum < 1)) {
      return setErr('Enter total target questions (1 or more)')
    }

    const old = goals.find(g => g.id === f.id)
    const isLc = f.goal_type === 'leetcode'
    const isTr = f.goal_type === 'transformers'
    const finalTarget = isLc ? Math.round(targetNum) : old?.target ?? 100
    const finalUnit = isLc ? 'questions' : '%'

    const lcStats = old && isLc ? calcLeetCodeStats({ ...old, target: finalTarget }, goalLogs) : null
    const trStats = old && isTr ? calcTransformersStats(allTasks.filter(t => t.goal_id === old.id)) : null

    const nextProgress = lcStats ? lcStats.completed : trStats ? trStats.overallPct : old?.progress ?? 0
    const nextStatus = lcStats ? lcStats.status : trStats ? trStats.status : old?.status ?? 'not_started'

    const { error } = await api.saveGoal({
      ...(old ?? { milestones: [] }),
      user_id: uid,
      title: f.title.trim(),
      description: f.description,
      category: cat,
      goal_type: f.goal_type,
      target: finalTarget,
      progress: nextProgress,
      unit: finalUnit,
      status: nextStatus,
      start_date: f.start_date,
      end_date: f.end_date,
      deadline: f.end_date,
      month: f.start_date.slice(0, 7),
      priority: f.priority as Goal['priority'],
    })
    if (error) setErr(error.message)
    else {
      setErr('')
      setF(blank())
      setModalOpen(false)
      reload()
    }
  }

  const setProgress = async (g: Goal, pct: number, status?: Goal['status']) => {
    pct = Math.max(0, Math.min(100, pct))
    const nextStatus = status ?? statusOf(pct)
    await api.saveGoal({
      ...g,
      progress: Math.round(((pct * g.target) / 100) * 100) / 100,
      status: nextStatus,
    })
    if (g.status !== 'completed' && nextStatus === 'completed') {
      setCelebrate(g.title)
    }
    reload()
  }

  const setStatus = (g: Goal, s: Goal['status']) => {
    const p = liveGoalPct(g, goalLogs, allTasks.filter(t => t.goal_id === g.id))
    setProgress(g, s === 'completed' ? 100 : s === 'not_started' ? 0 : p === 0 || p >= 100 ? 10 : p, s)
  }

  const edit = (g: Goal) => {
    setF({
      id: g.id,
      title: g.title,
      description: g.description ?? '',
      category: g.category,
      goal_type: getGoalType(g),
      target: String(g.target ?? 100),
      start_date: g.start_date!,
      end_date: g.end_date!,
      priority: g.priority,
    })
    setErr('')
    setModalOpen(true)
  }

  const visibleProfiles = memberTab === 'all' ? profiles : profiles.filter(p => p.id === memberTab)

  return (
    <Page
      title="Goals & Milestones"
      sub="Track timelines, LeetCode question targets, and manual Transformers checklists."
      right={
        <Button onClick={openNewModal}>
          <Plus size={16} />
          New Goal
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat boxed label="Active goals" value={activeCount} />
        <Stat boxed label="Completed" value={completedCount} />
        <button type="button" onClick={() => setFilter(filter === 'due' ? 'all' : 'due')} className="text-left">
          <div
            className={`rounded-xl border p-4 shadow-sm transition ${
              filter === 'due'
                ? 'border-amber-300 bg-amber-50/70'
                : 'border-brand-line bg-white hover:border-brand-hover'
            }`}
          >
            <p className="text-xs text-brand-muted">Due in 14 days</p>
            <p className="tabular-nums mt-0.5 text-2xl font-semibold text-amber-600">{dueSoonCount}</p>
          </div>
        </button>
        <button type="button" onClick={() => setFilter(filter === 'overdue' ? 'all' : 'overdue')} className="text-left">
          <div
            className={`rounded-xl border p-4 shadow-sm transition ${
              filter === 'overdue'
                ? 'border-red-300 bg-red-50/70'
                : 'border-brand-line bg-white hover:border-brand-hover'
            }`}
          >
            <p className="text-xs text-brand-muted">Overdue</p>
            <p className={`tabular-nums mt-0.5 text-2xl font-semibold ${overdueCount ? 'text-red-600' : 'text-brand-ink'}`}>
              {overdueCount}
            </p>
          </div>
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {profiles.length > 1 ? (
          <div className="inline-flex rounded-lg border border-brand-line bg-white p-0.5">
            <button
              type="button"
              onClick={() => setMemberTab('all')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                memberTab === 'all' ? 'bg-brand-soft text-brand-deep' : 'text-brand-muted hover:text-brand-ink'
              }`}
            >
              All ({goals.length})
            </button>
            {profiles.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setMemberTab(p.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  memberTab === p.id ? 'bg-brand-soft text-brand-deep' : 'text-brand-muted hover:text-brand-ink'
                }`}
              >
                {p.id === uid ? 'My goals' : p.display_name} ({goals.filter(g => g.user_id === p.id).length})
              </button>
            ))}
          </div>
        ) : (
          <div />
        )}

        {filter !== 'all' && (
          <button
            type="button"
            onClick={() => setFilter('all')}
            className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand-deep"
          >
            Filter: {filter === 'due' ? 'Due in 14 days' : 'Overdue'}
            <X size={12} />
          </button>
        )}
      </div>

      {visibleProfiles.map(p => {
        const mine = p.id === uid
        const rawList = goals.filter(g => g.user_id === p.id)
        const list =
          filter === 'overdue'
            ? rawList.filter(isOver)
            : filter === 'due'
              ? rawList.filter(isDueSoon)
              : rawList

        return (
          <section key={p.id} className="space-y-4">
            <h2 className="text-lg font-semibold text-brand-ink">
              {mine ? 'My goals' : `${p.display_name}'s goals`}
            </h2>

            {!list.length ? (
              <Card className="py-8 text-center">
                <p className="text-sm text-brand-muted">
                  {filter !== 'all' ? 'No goals match this filter.' : 'No goals yet.'}
                </p>
                {mine && filter === 'all' && (
                  <Button variant="secondary" onClick={openNewModal} className="mt-3">
                    <Plus size={15} />
                    Create your first goal
                  </Button>
                )}
              </Card>
            ) : (
              <>
                <ScheduleStrip goals={list} logs={goalLogs} tasks={allTasks} />
                <div className="grid gap-5 lg:grid-cols-2">
                  {list.map(g => {
                    const isLc = isLeetCodeGoal(g)
                    const isTr = isTransformersGoal(g)
                    const goalTasks = allTasks.filter(t => t.goal_id === g.id)
                    const lc = isLc ? calcLeetCodeStats(g, goalLogs) : null
                    const tr = isTr ? calcTransformersStats(goalTasks) : null
                    const pct = lc ? lc.pct : tr ? tr.overallPct : liveGoalPct(g, goalLogs, goalTasks)
                    const status = lc ? lc.status : tr ? tr.status : g.status
                    const over = status !== 'completed' && g.end_date! < today()

                    return (
                      <Tilt3DCard key={g.id} className="space-y-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-medium text-brand-deep">{g.category}</p>
                            <p className="mt-0.5 text-base font-semibold text-brand-ink">{g.title}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {over && (
                              <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs text-red-600">
                                overdue
                              </span>
                            )}
                            <span className={`rounded-full px-2.5 py-0.5 text-xs ${pri[g.priority]}`}>
                              {g.priority}
                            </span>
                          </div>
                        </div>

                        {g.description && <p className="text-sm text-brand-muted">{g.description}</p>}

                        <p className="tabular-nums text-xs text-brand-muted">
                          {fmtD(g.start_date!)} → {fmtD(g.end_date!)} · {daysBetween(g.start_date!, g.end_date!) + 1} days
                        </p>

                        <div className="space-y-2">
                          <Progress value={pct} />
                          <div className="tabular-nums flex flex-wrap items-center justify-between gap-2 text-sm">
                            {lc ? (
                              <span className="text-brand-body">
                                <strong className="text-brand-ink">{lc.completed}</strong>/{lc.target} solved ·{' '}
                                {lc.remaining} remaining
                              </span>
                            ) : tr ? (
                              <span className="text-brand-body">
                                <strong className="text-brand-ink">{tr.done}</strong>/{tr.total} tasks ·{' '}
                                {tr.pendingCount} pending
                              </span>
                            ) : (
                              <span className="text-brand-body">{pct}%</span>
                            )}
                            <span className="text-xs font-medium text-brand-deep">
                              {lc || tr ? `${pct}% · ` : ''}
                              {status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        {mine && !isLc && !isTr && (
                          <div className="flex flex-wrap items-center gap-2">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              className="w-24"
                              defaultValue={pct}
                              key={pct}
                              onBlur={e => +e.target.value !== pct && setProgress(g, +e.target.value)}
                            />
                            <Select
                              className="w-36"
                              value={g.status}
                              onChange={e => setStatus(g, e.target.value as Goal['status'])}
                            >
                              <option value="not_started">Not started</option>
                              <option value="in_progress">In progress</option>
                              <option value="completed">Completed</option>
                            </Select>
                          </div>
                        )}

                        {mine && (
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" onClick={() => edit(g)} title="Edit goal" className="px-2.5 py-1.5">
                              <Pencil size={15} />
                            </Button>
                            <Button
                              variant="danger"
                              className="px-2.5 py-1.5"
                              onClick={async () => {
                                if (confirm('Delete this goal and its linked tasks/logs?')) {
                                  await api.deleteGoal(g.id!)
                                  reload()
                                }
                              }}
                              title="Delete goal"
                            >
                              <Trash2 size={15} />
                            </Button>
                          </div>
                        )}

                        {isLc ? (
                          <>
                            <button
                              type="button"
                              className="flex items-center gap-1 text-sm text-brand-deep"
                              onClick={() => setOpen(open === g.id ? null : g.id!)}
                            >
                              {open === g.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              Daily LeetCode chart
                            </button>
                            {open === g.id && lc && (
                              <div className="h-44 rounded-lg border border-brand-line bg-white p-3">
                                <ResponsiveContainer>
                                  <BarChart
                                    data={
                                      lc.logs.length
                                        ? [...lc.logs]
                                            .sort((a, b) => a.date.localeCompare(b.date))
                                            .slice(-14)
                                            .map(l => ({ day: l.date.slice(5), Solved: l.questions_solved }))
                                        : [{ day: 'No logs', Solved: 0 }]
                                    }
                                  >
                                    <CartesianGrid stroke="#E3EDE6" vertical={false} />
                                    <XAxis dataKey="day" stroke="#5F7D6E" fontSize={11} />
                                    <YAxis stroke="#5F7D6E" fontSize={11} allowDecimals={false} />
                                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E3EDE6' }} />
                                    <Bar dataKey="Solved" fill="#2F7A6E" radius={[4, 4, 0, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            )}
                          </>
                        ) : isTr ? (
                          <>
                            <button
                              type="button"
                              className="flex items-center gap-1 text-sm text-brand-deep"
                              onClick={() => setOpen(open === g.id ? null : g.id!)}
                            >
                              {open === g.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              Weekly topics & tasks ({tr?.done ?? 0}/{tr?.total ?? 0})
                            </button>
                            {open === g.id && (
                              <TransformersTracker
                                goal={g}
                                mine={mine}
                                onSync={reload}
                                onGoalCompleted={title => setCelebrate(title)}
                              />
                            )}
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="flex items-center gap-1 text-sm text-brand-deep"
                              onClick={() => setOpen(open === g.id ? null : g.id!)}
                            >
                              {open === g.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              Weekly tasks
                            </button>
                            {open === g.id && <WeeklyTasks goal={g} mine={mine} />}
                          </>
                        )}
                      </Tilt3DCard>
                    )
                  })}
                </div>
              </>
            )}
          </section>
        )
      })}

      {/* Goal Creation & Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/30 p-4"
          onClick={closeModal}
        >
          <div
            className="animate-pop max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-brand-line bg-white p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between border-b border-brand-line pb-3">
              <div>
                <h2 className="text-lg font-semibold text-brand-ink">
                  {f.id ? 'Edit Goal' : 'Create New Goal'}
                </h2>
                <p className="text-xs text-brand-muted">
                  Choose a goal type, timeline, and target.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1.5 text-brand-muted hover:bg-brand-bg hover:text-brand-ink"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-muted">
                  1. Goal Type
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(
                    [
                      ['general', 'General Goal', 'Milestones & %', Target],
                      ['leetcode', 'LeetCode', 'Question target', Code2],
                      ['transformers', 'Transformers', 'Manual weekly tasks', Cpu],
                    ] as const
                  ).map(([gt, label, desc, Icon]) => {
                    const active = f.goal_type === gt
                    return (
                      <button
                        key={gt}
                        type="button"
                        onClick={() => pickGoalType(gt)}
                        className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition ${
                          active
                            ? 'border-brand-deep bg-brand-soft/60 text-brand-ink'
                            : 'border-brand-line bg-white text-brand-body hover:border-brand-hover hover:bg-brand-bg/50'
                        }`}
                      >
                        <Icon size={16} className={`mt-0.5 shrink-0 ${active ? 'text-brand-deep' : 'text-brand-muted'}`} />
                        <div>
                          <p className="text-xs font-semibold">{label}</p>
                          <p className="text-[11px] text-brand-muted">{desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                  2. Details
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Goal name *" className="sm:col-span-2">
                    <Input
                      value={f.title}
                      placeholder={
                        f.goal_type === 'leetcode'
                          ? 'e.g. Blind 75 / NeetCode 150'
                          : f.goal_type === 'transformers'
                            ? 'e.g. Transformers Fundamentals'
                            : 'e.g. System Design Revision'
                      }
                      onChange={e => setF({ ...f, title: e.target.value })}
                    />
                  </Field>
                  <Field label="Category">
                    <Select value={cat} onChange={e => setF({ ...f, category: e.target.value })}>
                      {names.map(c => (
                        <option key={c}>{c}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Priority">
                    <Select value={f.priority} onChange={e => setF({ ...f, priority: e.target.value })}>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </Select>
                  </Field>
                </div>

                <div className="rounded-lg bg-brand-bg/70 p-2.5">
                  <div className="flex gap-2">
                    <Input
                      className="h-8 flex-1 text-xs"
                      value={newCat}
                      placeholder="Add custom category..."
                      onChange={e => setNewCat(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addCat()}
                    />
                    <Button type="button" variant="secondary" onClick={addCat} className="h-8 px-3 text-xs">
                      Add
                    </Button>
                  </div>
                  {!!cats.length && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {cats.map(c => (
                        <Badge key={c.id} className="gap-1">
                          {c.name}
                          <button
                            type="button"
                            title="Remove category"
                            onClick={async () => {
                              await api.deleteCategory(c.id)
                              reloadCats()
                            }}
                            className="text-brand-muted hover:text-red-600"
                          >
                            <X size={11} />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                  3. Timeline {f.goal_type === 'leetcode' ? '& Target' : ''}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Start date">
                    <Input
                      type="date"
                      value={f.start_date}
                      onChange={e => setF({ ...f, start_date: e.target.value })}
                    />
                  </Field>
                  <Field label="Target date *">
                    <Input
                      type="date"
                      min={f.start_date}
                      value={f.end_date}
                      onChange={e => setF({ ...f, end_date: e.target.value })}
                    />
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {[
                        ['2 wks', 14],
                        ['1 mo', 30],
                        ['2 mo', 60],
                        ['3 mo', 90],
                      ].map(([l, n]) => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => setF({ ...f, end_date: addDays(f.start_date, n as number) })}
                          className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs text-brand-body hover:bg-brand-hover"
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </Field>

                  {f.goal_type === 'leetcode' && (
                    <Field
                      label="Total target questions *"
                      hint="Completed, remaining, and % calculate automatically from Daily Updates."
                      className="sm:col-span-2"
                    >
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        placeholder="e.g. 150"
                        value={f.target}
                        onChange={e => setF({ ...f, target: e.target.value })}
                      />
                    </Field>
                  )}
                </div>
              </div>

              <Field label="Description (optional)">
                <Textarea
                  rows={2}
                  value={f.description}
                  placeholder="Optional scope or focus notes..."
                  onChange={e => setF({ ...f, description: e.target.value })}
                />
              </Field>

              {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{err}</p>}

              <div className="flex items-center justify-end gap-2 border-t border-brand-line pt-4">
                <Button type="button" variant="secondary" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="button" onClick={save}>
                  {f.id ? 'Save changes' : 'Create goal'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CelebrationBanner title={celebrate} onClose={() => setCelebrate(null)} />
    </Page>
  )
}
