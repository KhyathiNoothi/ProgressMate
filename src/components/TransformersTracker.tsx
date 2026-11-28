import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart2, Check, ChevronLeft, ChevronRight, ExternalLink, FolderPlus, Layers, ListChecks, Pencil, Plus, Trash2, X } from 'lucide-react'
import { api } from '../services/api'
import { useLive } from '../hooks'
import type { Goal, WeeklyTask, WeeklyTopic } from '../lib/types'
import { addDays, calcTransformersStats, fmtD, today, weekStart } from '../lib/utils'
import { Badge, Button, Input, Progress } from './ui'

type Tab = 'checklist' | 'pending' | 'graph'

export default function TransformersTracker({
  goal,
  mine,
  initialWeek,
  onSync,
  onGoalCompleted,
}: {
  goal: Goal
  mine: boolean
  initialWeek?: string
  onSync?: () => void
  onGoalCompleted?: (title: string) => void
}) {
  const [ws, setWs] = useState(() => weekStart(initialWeek || today()))
  const [tab, setTab] = useState<Tab>('checklist')
  const [newTopic, setNewTopic] = useState('')
  const [editTopicId, setEditTopicId] = useState<string | null>(null)
  const [editTopicTitle, setEditTopicTitle] = useState('')
  const [taskInputs, setTaskInputs] = useState<Record<string, string>>({})
  const [editTaskId, setEditTaskId] = useState<string | null>(null)
  const [editTaskTitle, setEditTaskTitle] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    if (initialWeek) setWs(weekStart(initialWeek))
  }, [initialWeek])

  const { data: topics, reload: reloadTopics } = useLive<WeeklyTopic>(
    'weekly_topics',
    () => (goal.id ? api.topics(goal.id) : Promise.resolve([])),
    [goal.id]
  )
  const { data: tasks, reload: reloadTasks } = useLive<WeeklyTask>(
    'weekly_tasks',
    () => (goal.id ? api.tasks(goal.id) : Promise.resolve([])),
    [goal.id]
  )

  const stats = useMemo(() => calcTransformersStats(tasks, ws), [tasks, ws])
  const weekTopics = useMemo(() => topics.filter(t => t.week_start === ws), [topics, ws])
  const ungroupedWeekTasks = useMemo(
    () => stats.weekTasks.filter(t => !t.topic_id || !weekTopics.some(tp => tp.id === t.topic_id)),
    [stats.weekTasks, weekTopics]
  )

  const topicMap = useMemo(() => {
    const m = new Map<string, WeeklyTopic>()
    topics.forEach(t => { if (t.id) m.set(t.id, t) })
    return m
  }, [topics])

  const graphData = useMemo(() => {
    const weeks = new Set<string>([
      ...stats.weeklyBreakdown.map(w => w.week_start),
      ...topics.map(t => t.week_start),
    ])
    return Array.from(weeks)
      .sort()
      .map(w => {
        const found = stats.weeklyBreakdown.find(x => x.week_start === w)
        return found ?? { week_start: w, week: w.slice(5), completed: 0, pending: 0, total: 0, pct: 0 }
      })
  }, [stats.weeklyBreakdown, topics])

  const syncAll = async () => {
    await reloadTasks()
    await api.syncTransformersGoalProgress(goal)
    onSync?.()
  }

  const addTopic = async () => {
    const title = newTopic.trim()
    if (!title || !goal.id) return
    setErr('')
    const { error } = await api.saveTopic({
      user_id: goal.user_id,
      goal_id: goal.id,
      week_start: ws,
      title,
      sort_order: weekTopics.length,
    })
    if (error) return setErr(error.message)
    setNewTopic('')
    reloadTopics()
  }

  const saveTopicEdit = async (topic: WeeklyTopic) => {
    const title = editTopicTitle.trim()
    if (!title) return
    setErr('')
    const { error } = await api.saveTopic({ ...topic, title })
    if (error) return setErr(error.message)
    setEditTopicId(null)
    reloadTopics()
  }

  const removeTopic = async (topic: WeeklyTopic) => {
    if (!topic.id) return
    const count = tasks.filter(t => t.topic_id === topic.id).length
    const msg = count
      ? `Delete topic "${topic.title}"? Its ${count} task(s) will remain under General Tasks.`
      : `Delete topic "${topic.title}"?`
    if (!confirm(msg)) return
    const { error } = await api.deleteTopic(topic.id)
    if (error) return setErr(error.message)
    reloadTopics()
    reloadTasks()
  }

  const addTask = async (topicId: string | null) => {
    const key = topicId ?? '__general__'
    const title = (taskInputs[key] ?? '').trim()
    if (!title || !goal.id) return
    setErr('')
    const { error } = await api.saveTask({
      user_id: goal.user_id,
      goal_id: goal.id,
      week_start: ws,
      topic_id: topicId,
      title,
      link: null,
      is_done: false,
    })
    if (error) return setErr(error.message)
    setTaskInputs(prev => ({ ...prev, [key]: '' }))
    await syncAll()
  }

  const toggleTask = async (t: WeeklyTask) => {
    if (!mine) return
    setErr('')
    const nextDone = !t.is_done
    const { error } = await api.saveTask({ ...t, is_done: nextDone })
    if (error) return setErr(error.message)
    if (nextDone && tasks.length > 0 && tasks.every(x => (x.id === t.id ? true : x.is_done))) {
      onGoalCompleted?.(goal.title)
    }
    await syncAll()
  }

  const saveTaskEdit = async (t: WeeklyTask) => {
    const title = editTaskTitle.trim()
    if (!title) return
    setErr('')
    const { error } = await api.saveTask({ ...t, title })
    if (error) return setErr(error.message)
    setEditTaskId(null)
    reloadTasks()
  }

  const removeTask = async (t: WeeklyTask) => {
    if (!t.id) return
    const { error } = await api.deleteTask(t.id)
    if (error) return setErr(error.message)
    await syncAll()
  }

  const renderTaskRow = (t: WeeklyTask, showWeek = false) => {
    const isEditing = editTaskId === t.id
    return (
      <div
        key={t.id}
        className="flex flex-wrap items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition hover:bg-brand-bg/70"
      >
        <input
          type="checkbox"
          disabled={!mine}
          checked={t.is_done}
          onChange={() => toggleTask(t)}
          className={`h-4 w-4 cursor-pointer rounded ${t.is_done ? 'animate-check-pop' : ''}`}
        />
        {isEditing ? (
          <div className="flex flex-1 items-center gap-2">
            <Input
              className="h-8 flex-1"
              value={editTaskTitle}
              onChange={e => setEditTaskTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveTaskEdit(t)}
              placeholder="Task title"
            />
            <button
              type="button"
              onClick={() => saveTaskEdit(t)}
              className="rounded-md bg-brand-deep p-1.5 text-white"
              title="Save"
            >
              <Check size={13} />
            </button>
            <button
              type="button"
              onClick={() => setEditTaskId(null)}
              className="rounded-md p-1.5 text-brand-muted hover:bg-brand-soft"
              title="Cancel"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <>
            <span className={`flex-1 ${t.is_done ? 'line-through text-brand-muted' : 'text-brand-ink'}`}>
              {t.title}
              {showWeek && (
                <Badge className="ml-2">
                  {fmtD(t.week_start)}
                  {t.topic_id && topicMap.get(t.topic_id) ? ` · ${topicMap.get(t.topic_id)!.title}` : ''}
                </Badge>
              )}
            </span>
            {t.link && (
              <a
                href={t.link}
                target="_blank"
                rel="noreferrer"
                className="rounded p-1 text-brand-deep hover:bg-brand-soft"
                title={t.link}
              >
                <ExternalLink size={13} />
              </a>
            )}
            {mine && (
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setEditTaskId(t.id!)
                    setEditTaskTitle(t.title)
                  }}
                  className="rounded p-1 text-brand-muted hover:bg-brand-soft hover:text-brand-ink"
                  title="Edit task"
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => removeTask(t)}
                  className="rounded p-1 text-brand-muted hover:bg-red-50 hover:text-red-600"
                  title="Delete task"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4 border-t border-brand-line pt-4">
      <div className="space-y-2 rounded-lg bg-brand-bg/80 px-3.5 py-2.5">
        <div className="tabular-nums flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-3 text-brand-body">
            <span>
              Week: <strong className="text-brand-ink">{stats.weekPct}%</strong> ({stats.weekDone}/{stats.weekTotal})
            </span>
            <span className="text-brand-line">|</span>
            <span>
              Overall: <strong className="text-brand-ink">{stats.overallPct}%</strong> ({stats.done}/{stats.total})
            </span>
            <span className="text-brand-line">|</span>
            <span>
              Pending: <strong className="text-amber-700">{stats.pendingCount}</strong>
            </span>
          </div>
          <span className="text-[11px] text-brand-muted">Auto-synced</span>
        </div>
        <Progress value={stats.overallPct} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg bg-brand-bg p-0.5">
          {(
            [
              ['checklist', 'Topics & Tasks', ListChecks],
              ['pending', `Pending (${stats.pendingCount})`, Layers],
              ['graph', 'Progress', BarChart2],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                tab === id
                  ? 'bg-white text-brand-ink shadow-sm'
                  : 'text-brand-muted hover:text-brand-ink'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {tab === 'checklist' && (
          <div className="flex items-center gap-1 rounded-lg border border-brand-line bg-white px-1.5 py-0.5 text-xs">
            <button
              type="button"
              onClick={() => setWs(addDays(ws, -7))}
              className="rounded p-1 text-brand-muted hover:bg-brand-bg hover:text-brand-ink"
              title="Previous week"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="tabular-nums px-1.5 font-medium text-brand-ink">Week of {fmtD(ws)}</span>
            <button
              type="button"
              onClick={() => setWs(addDays(ws, 7))}
              className="rounded p-1 text-brand-muted hover:bg-brand-bg hover:text-brand-ink"
              title="Next week"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {err && <p className="text-xs text-red-600">{err}</p>}

      {tab === 'checklist' && (
        <div className="space-y-3">
          {mine && (
            <div className="flex flex-wrap gap-2">
              <Input
                className="h-9 min-w-44 flex-1"
                placeholder="Add manual weekly topic (e.g. Self-Attention)"
                value={newTopic}
                onChange={e => setNewTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTopic()}
              />
              <Button type="button" variant="secondary" onClick={addTopic} className="h-9 text-xs">
                <FolderPlus size={14} />
                Add Topic
              </Button>
            </div>
          )}

          {weekTopics.map(topic => {
            const tTasks = stats.weekTasks.filter(t => t.topic_id === topic.id)
            const tDone = tTasks.filter(t => t.is_done).length
            const tPct = tTasks.length ? Math.round((tDone / tTasks.length) * 100) : 0
            const isEd = editTopicId === topic.id

            return (
              <div key={topic.id} className="overflow-hidden rounded-lg border border-brand-line bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-line bg-brand-bg/60 px-3 py-2">
                  {isEd ? (
                    <div className="flex flex-1 items-center gap-2">
                      <Input
                        className="h-8 flex-1"
                        value={editTopicTitle}
                        onChange={e => setEditTopicTitle(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveTopicEdit(topic)}
                      />
                      <button
                        type="button"
                        onClick={() => saveTopicEdit(topic)}
                        className="rounded-md bg-brand-deep p-1.5 text-white"
                        title="Save topic"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditTopicId(null)}
                        className="rounded-md p-1.5 text-brand-muted hover:bg-brand-soft"
                        title="Cancel"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-brand-ink">{topic.title}</span>
                        <Badge tone={tPct === 100 && tTasks.length ? 'mint' : 'neutral'}>
                          {tDone}/{tTasks.length} · {tPct}%
                        </Badge>
                      </div>
                      {mine && (
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditTopicId(topic.id!)
                              setEditTopicTitle(topic.title)
                            }}
                            className="rounded p-1 text-brand-muted hover:bg-white hover:text-brand-ink"
                            title="Edit topic"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeTopic(topic)}
                            className="rounded p-1 text-brand-muted hover:bg-red-50 hover:text-red-600"
                            title="Delete topic"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="divide-y divide-brand-line/60 px-1.5 py-1">
                  {tTasks.map(t => renderTaskRow(t))}
                  {!tTasks.length && (
                    <p className="px-2 py-2 text-xs text-brand-muted">No tasks under this topic yet.</p>
                  )}
                </div>

                {mine && (
                  <div className="flex gap-2 border-t border-brand-line/80 bg-brand-bg/30 px-3 py-2">
                    <Input
                      className="h-8 flex-1"
                      placeholder={`Add task to "${topic.title}"`}
                      value={taskInputs[topic.id!] ?? ''}
                      onChange={e => setTaskInputs(prev => ({ ...prev, [topic.id!]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && addTask(topic.id!)}
                    />
                    <Button type="button" variant="secondary" onClick={() => addTask(topic.id!)} className="h-8 px-3 text-xs">
                      <Plus size={13} />
                      Add
                    </Button>
                  </div>
                )}
              </div>
            )
          })}

          {(!!ungroupedWeekTasks.length || (!weekTopics.length && mine)) && (
            <div className="overflow-hidden rounded-lg border border-brand-line bg-white">
              <div className="flex items-center justify-between border-b border-brand-line bg-brand-bg/40 px-3 py-2">
                <span className="text-xs font-medium text-brand-body">
                  {weekTopics.length ? 'General Tasks' : 'Checklist Tasks'}
                </span>
                <span className="tabular-nums text-xs text-brand-muted">
                  {ungroupedWeekTasks.filter(t => t.is_done).length}/{ungroupedWeekTasks.length}
                </span>
              </div>
              <div className="divide-y divide-brand-line/60 px-1.5 py-1">
                {ungroupedWeekTasks.map(t => renderTaskRow(t))}
                {!ungroupedWeekTasks.length && (
                  <p className="px-2 py-2 text-xs text-brand-muted">No tasks for this week yet.</p>
                )}
              </div>
              {mine && (
                <div className="flex gap-2 border-t border-brand-line/80 bg-brand-bg/30 px-3 py-2">
                  <Input
                    className="h-8 flex-1"
                    placeholder="Add a task for this week"
                    value={taskInputs.__general__ ?? ''}
                    onChange={e => setTaskInputs(prev => ({ ...prev, __general__: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addTask(null)}
                  />
                  <Button type="button" variant="secondary" onClick={() => addTask(null)} className="h-8 px-3 text-xs">
                    <Plus size={13} />
                    Add
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'pending' && (
        <div className="divide-y divide-brand-line rounded-lg border border-brand-line bg-white px-2">
          {!stats.pending.length ? (
            <p className="p-4 text-center text-xs text-brand-deep">All checklist tasks for this goal are completed.</p>
          ) : (
            stats.pending.map(t => renderTaskRow(t, true))
          )}
        </div>
      )}

      {tab === 'graph' && (
        <div className="rounded-lg border border-brand-line bg-white p-3.5">
          <p className="mb-2 text-xs font-medium text-brand-muted">Weekly completion</p>
          {graphData.length ? (
            <div className="h-48">
              <ResponsiveContainer>
                <BarChart data={graphData}>
                  <CartesianGrid stroke="#E2ECE6" vertical={false} />
                  <XAxis dataKey="week" stroke="#617D70" fontSize={11} />
                  <YAxis stroke="#617D70" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #E2ECE6', borderRadius: 8, fontSize: 12 }}
                    formatter={(val: any, name: string, item: any) =>
                      name === 'Completed' ? [`${val} (${item?.payload?.pct ?? 0}%)`, name] : [val, name]
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="completed" name="Completed" stackId="a" fill="#2F7A6E" />
                  <Bar dataKey="pending" name="Pending" stackId="a" fill="#DDF3E7" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-brand-muted">Add weekly topics and tasks to see weekly progress.</p>
          )}
        </div>
      )}
    </div>
  )
}
