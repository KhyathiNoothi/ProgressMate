import { useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, Trash2 } from 'lucide-react'
import { api } from '../services/api'
import { useLive } from '../hooks'
import type { Goal, WeeklyTask } from '../lib/types'
import { addDays, fmtD, today, weekStart } from '../lib/utils'
import { Button, Input, Progress } from './ui'

export default function WeeklyTasks({ goal, mine }: { goal: Goal; mine: boolean }) {
  const [ws, setWs] = useState(weekStart(today()))
  const { data, reload } = useLive<WeeklyTask>('weekly_tasks', () => api.tasks(goal.id!), [goal.id])
  const [title, setTitle] = useState('')
  const [qns, setQns] = useState('')
  const isDsa = /dsa|leetcode/i.test(goal.category)
  const week = data.filter(t => t.week_start === ws)
  const done = week.filter(t => t.is_done)
  const pend = week.filter(t => !t.is_done)
  const pct = week.length ? Math.round((done.length / week.length) * 100) : 0

  const add = async () => {
    if (!title.trim()) return
    await api.saveTask({
      user_id: goal.user_id,
      goal_id: goal.id,
      week_start: ws,
      topic_id: null,
      title: title.trim(),
      link: null,
      is_done: false,
    })
    setTitle('')
    reload()
  }
  const patch = async (t: WeeklyTask, p: Partial<WeeklyTask>) => {
    await api.saveTask({ ...t, ...p })
    reload()
  }
  const addQns = async () => {
    const nums: number[] = []
    qns
      .split(/[,\s]+/)
      .filter(Boolean)
      .forEach(p => {
        const m = p.match(/^(\d+)-(\d+)$/)
        if (m) {
          for (let i = +m[1]; i <= +m[2] && i - +m[1] < 100; i++) nums.push(i)
        } else if (/^\d+$/.test(p)) nums.push(+p)
      })
    const have = new Set(week.map(t => t.title))
    const rows = [...new Set(nums)]
      .filter(n => !have.has(`LeetCode #${n}`))
      .map(n => ({
        user_id: goal.user_id,
        goal_id: goal.id,
        week_start: ws,
        topic_id: null,
        title: `LeetCode #${n}`,
        link: `https://leetcode.com/problemset/?search=${n}`,
        is_done: false,
      }))
    if (rows.length) {
      await api.saveTasks(rows)
      reload()
    }
    setQns('')
  }
  const row = (t: WeeklyTask) => (
    <div key={t.id} className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-brand-bg/70">
      <input
        type="checkbox"
        disabled={!mine}
        checked={t.is_done}
        onChange={() => patch(t, { is_done: !t.is_done })}
        className={t.is_done ? 'animate-check-pop' : ''}
      />
      {mine ? (
        <Input
          className={`h-8 flex-1 ${t.is_done ? 'line-through opacity-60' : ''}`}
          defaultValue={t.title}
          onBlur={e => e.target.value.trim() && e.target.value.trim() !== t.title && patch(t, { title: e.target.value.trim() })}
        />
      ) : (
        <span className={`flex-1 ${t.is_done ? 'line-through opacity-60' : ''}`}>{t.title}</span>
      )}
      {t.link && (
        <a href={t.link} target="_blank" rel="noreferrer" className="text-brand-deep">
          <ExternalLink size={13} />
        </a>
      )}
      {mine && (
        <button
          onClick={async () => {
            await api.deleteTask(t.id!)
            reload()
          }}
          className="rounded p-1 text-brand-muted hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )

  return (
    <div className="space-y-3 border-t border-brand-line pt-3">
      <div className="flex items-center justify-between text-xs">
        <button onClick={() => setWs(addDays(ws, -7))} className="rounded p-1 text-brand-muted hover:bg-brand-bg">
          <ChevronLeft size={16} />
        </button>
        <span className="tabular-nums font-medium text-brand-body">
          Week of {fmtD(ws)} · {pct}% done ({done.length}/{week.length})
        </span>
        <button onClick={() => setWs(addDays(ws, 7))} className="rounded p-1 text-brand-muted hover:bg-brand-bg">
          <ChevronRight size={16} />
        </button>
      </div>
      <Progress value={pct} />
      {mine && (
        <div className="flex gap-2">
          <Input
            className="flex-1"
            placeholder={goal.category === 'DSA' ? 'Question / problem to solve this week' : 'Task for this week'}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
          />
          <Button onClick={add}>Add</Button>
        </div>
      )}
      {mine && isDsa && (
        <div className="flex gap-2">
          <Input
            placeholder="Question numbers, e.g. 1, 15, 42-45"
            value={qns}
            onChange={e => setQns(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addQns()}
          />
          <Button variant="secondary" onClick={addQns}>
            Add questions
          </Button>
        </div>
      )}
      {!week.length && <p className="text-xs text-brand-muted">No tasks for this week.</p>}
      {!!pend.length && (
        <div className="divide-y divide-brand-line/60 rounded-lg border border-brand-line bg-white px-1">
          {pend.map(row)}
        </div>
      )}
      {!!done.length && (
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-brand-muted">Completed ({done.length})</p>
          <div className="divide-y divide-brand-line/60 rounded-lg border border-brand-line bg-brand-bg/40 px-1">
            {done.map(row)}
          </div>
        </div>
      )}
    </div>
  )
}
