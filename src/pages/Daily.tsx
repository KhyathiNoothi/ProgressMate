import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Code2, Cpu, FileText, Trash2 } from 'lucide-react'
import { api } from '../services/api'
import { useCtx, useLive } from '../hooks'
import type { Goal, GoalDailyLog, Update } from '../lib/types'
import { daysAgo, fmt, fmtD, isLeetCodeGoal, isTransformersGoal, today } from '../lib/utils'
import { Badge, Button, Card, CelebrationBanner, Field, Input, Page, Progress, Textarea } from '../components/ui'
import TransformersTracker from '../components/TransformersTracker'

const blankGeneral = () => ({
  text: '',
  learned: '',
  hours: '' as number | '',
  lc: '' as number | '',
  topics: '',
  link: '',
})
type GF = ReturnType<typeof blankGeneral>
const toGeneralForm = (u: Update): GF => ({
  text: u.completed || u.tasks || u.worked_on || '',
  learned: u.learned || '',
  hours: u.hours || '',
  lc: u.leetcode_count || '',
  topics: u.topics.join(', '),
  link: u.github_links.join(', '),
})
const hasGeneralDetails = (f: GF) => !!(f.lc || f.topics.trim() || f.link.trim())
const links = (s: string) => s.split(/[,\s]+/).map(x => x.trim()).filter(Boolean)

export default function Daily() {
  const { uid } = useCtx()
  const [date, setDate] = useState(today())
  const [mode, setMode] = useState<'general' | string>('general')

  const [f, setF] = useState<GF>(blankGeneral())
  const [more, setMore] = useState(false)
  const [existsGeneral, setExistsGeneral] = useState<Update | null>(null)

  const [lcCount, setLcCount] = useState<string>('')
  const [goalHours, setGoalHours] = useState<string>('')
  const [goalNotes, setGoalNotes] = useState<string>('')
  const [existsGoalLog, setExistsGoalLog] = useState<GoalDailyLog | null>(null)

  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [celebrate, setCelebrate] = useState<string | null>(null)

  const { data: goals, reload: reloadGoals } = useLive<Goal>('goals', () => api.allGoals(), [])
  const { data: recent, reload: reloadUpdates } = useLive<Update>(
    'daily_updates',
    () => api.updates(fmt(daysAgo(90)), today()),
    []
  )
  const { data: allGoalLogs, reload: reloadGoalLogs } = useLive<GoalDailyLog>(
    'goal_daily_logs',
    () => api.goalLogs(),
    []
  )

  useEffect(() => {
    if (!celebrate) return
    const t = setTimeout(() => setCelebrate(null), 4000)
    return () => clearTimeout(t)
  }, [celebrate])

  const mineGoals = useMemo(() => goals.filter(g => g.user_id === uid), [goals, uid])
  const mineUpdates = useMemo(() => recent.filter(u => u.user_id === uid), [recent, uid])
  const mineGoalLogs = useMemo(() => allGoalLogs.filter(l => l.user_id === uid), [allGoalLogs, uid])

  const selectedGoal = useMemo(
    () => (mode === 'general' ? null : mineGoals.find(g => g.id === mode) ?? null),
    [mode, mineGoals]
  )

  useEffect(() => {
    setMsg('')
    api.updateOn(uid, date).then(u => {
      const nf = u ? toGeneralForm(u) : blankGeneral()
      setExistsGeneral(u)
      setF(nf)
      setMore(hasGeneralDetails(nf))
    })
  }, [date, uid])

  useEffect(() => {
    setMsg('')
    if (!selectedGoal?.id) {
      setExistsGoalLog(null)
      setLcCount('')
      setGoalHours('')
      setGoalNotes('')
      return
    }
    api.goalLogOn(uid, selectedGoal.id, date).then(l => {
      setExistsGoalLog(l)
      setLcCount(l && l.questions_solved ? String(l.questions_solved) : l ? '0' : '')
      setGoalHours(l && l.hours_spent ? String(l.hours_spent) : '')
      setGoalNotes(l?.learning_notes ?? '')
    })
  }, [date, uid, selectedGoal?.id])

  const reloadAll = () => {
    reloadUpdates()
    reloadGoalLogs()
    reloadGoals()
  }

  const lcPreview = useMemo(() => {
    if (!selectedGoal || !isLeetCodeGoal(selectedGoal)) return null
    const otherLogs = mineGoalLogs.filter(
      l => l.goal_id === selectedGoal.id && l.date !== date && !l.is_draft
    )
    const baseDone = otherLogs.reduce((a, l) => a + (Number(l.questions_solved) || 0), 0)
    const todayVal = lcCount === '' ? 0 : Math.max(0, Math.round(Number(lcCount) || 0))
    const completed = baseDone + todayVal
    const target = Math.max(1, Number(selectedGoal.target) || 1)
    const remaining = Math.max(0, target - completed)
    const pct = Math.min(100, Math.round((completed / target) * 100))
    return { completed, target, remaining, pct }
  }, [selectedGoal, mineGoalLogs, date, lcCount])

  const saveGeneral = async (draft: boolean) => {
    if (!draft && !f.text.trim() && !f.learned.trim() && !f.hours && !f.lc) {
      return setMsg("Enter Today's Progress, Learning Notes, or Time Spent to save.")
    }
    if (draft && !f.text.trim() && !f.learned.trim() && !f.hours && !hasGeneralDetails(f)) {
      return setMsg('Nothing to save yet.')
    }
    setBusy(true)
    setMsg('')
    try {
      const { error } = await api.saveUpdate({
        user_id: uid,
        date,
        tasks: f.text.trim(),
        completed: f.text.trim(),
        learned: f.learned.trim(),
        hours: +f.hours || 0,
        leetcode_count: +f.lc || 0,
        topics: f.topics.split(',').map(t => t.trim()).filter(Boolean),
        github_links: links(f.link),
        is_draft: draft,
      } as Update)
      if (error) throw error
      setMsg(draft ? 'Draft saved' : 'General update saved')
      reloadUpdates()
      setExistsGeneral(await api.updateOn(uid, date))
    } catch (e: any) {
      setMsg(e.message ?? 'Save failed')
    }
    setBusy(false)
  }

  const saveGoalEntry = async (draft: boolean) => {
    if (!selectedGoal?.id) return
    const isLc = isLeetCodeGoal(selectedGoal)
    const parsedQ = lcCount === '' ? 0 : Math.max(0, Math.round(Number(lcCount) || 0))
    const parsedHours = goalHours === '' ? 0 : Math.max(0, Number(goalHours) || 0)

    if (isLc && lcCount === '') {
      return setMsg('Enter the number of questions solved.')
    }
    if (!isLc && !parsedHours && !goalNotes.trim()) {
      return setMsg('Enter time spent or learning notes to save.')
    }

    const wasCompleted = selectedGoal.status === 'completed'
    setBusy(true)
    setMsg('')
    try {
      const { error } = await api.saveGoalLog({
        user_id: uid,
        goal_id: selectedGoal.id,
        date,
        questions_solved: isLc ? parsedQ : 0,
        hours_spent: parsedHours,
        learning_notes: goalNotes.trim(),
        is_draft: draft,
      })
      if (error) throw error
      if (isLc) {
        await api.syncLeetCodeGoalProgress(selectedGoal)
        if (!draft && !wasCompleted && lcPreview && lcPreview.completed >= lcPreview.target) {
          setCelebrate(selectedGoal.title)
        }
      }
      setMsg(draft ? 'Draft saved' : 'Saved')
      reloadAll()
      setExistsGoalLog(await api.goalLogOn(uid, selectedGoal.id, date))
    } catch (e: any) {
      setMsg(e.message ?? 'Save failed')
    }
    setBusy(false)
  }

  const logsOnSelectedDate = useMemo(
    () => mineGoalLogs.filter(l => l.date === date),
    [mineGoalLogs, date]
  )
  const goalTitle = (id: string) => mineGoals.find(g => g.id === id)?.title ?? 'Goal'

  const combinedRecent = useMemo(() => {
    const items: Array<
      | { kind: 'general'; date: string; row: Update }
      | { kind: 'goal'; date: string; row: GoalDailyLog; goal: Goal | undefined }
    > = [
      ...mineUpdates.map(row => ({ kind: 'general' as const, date: row.date, row })),
      ...mineGoalLogs
        .filter(l => l.date >= fmt(daysAgo(90)))
        .map(row => ({
          kind: 'goal' as const,
          date: row.date,
          row,
          goal: mineGoals.find(g => g.id === row.goal_id),
        })),
    ]
    return items.sort((a, b) => b.date.localeCompare(a.date))
  }, [mineUpdates, mineGoalLogs, mineGoals])

  return (
    <Page
      title="Daily Updates"
      sub="Log general progress and individual goals on the same date without overwriting."
      right={
        <Input
          type="date"
          className="w-44"
          max={today()}
          value={date}
          onChange={e => setDate(e.target.value)}
        />
      }
    >
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-brand-line bg-white p-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => setMode('general')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            mode === 'general' ? 'bg-brand-deep text-white' : 'text-brand-body hover:bg-brand-bg'
          }`}
        >
          <FileText size={14} />
          General Update
          {existsGeneral && (
            <CheckCircle2 size={13} className={mode === 'general' ? 'text-brand-soft' : 'text-brand-primary'} />
          )}
        </button>

        {mineGoals.map(g => {
          const isLc = isLeetCodeGoal(g)
          const isTr = isTransformersGoal(g)
          const hasLog = logsOnSelectedDate.some(l => l.goal_id === g.id)
          const Icon = isLc ? Code2 : isTr ? Cpu : FileText
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setMode(g.id!)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                mode === g.id ? 'bg-brand-deep text-white' : 'text-brand-body hover:bg-brand-bg'
              }`}
            >
              <Icon size={14} />
              <span className="max-w-44 truncate">{g.title}</span>
              {hasLog && <CheckCircle2 size={13} className={mode === g.id ? 'text-brand-soft' : 'text-brand-primary'} />}
            </button>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-8">
          {mode === 'general' && (
            <Card className="space-y-4">
              <div className="flex items-center justify-between border-b border-brand-line pb-3">
                <div>
                  <h2 className="text-base font-semibold text-brand-ink">General Daily Update</h2>
                  <p className="text-xs text-brand-muted">{fmtD(date)}</p>
                </div>
                {existsGeneral && (
                  <Badge tone={existsGeneral.is_draft ? 'amber' : 'mint'}>
                    {existsGeneral.is_draft ? 'Draft' : 'Saved'}
                  </Badge>
                )}
              </div>

              <Field label="Today's progress">
                <Textarea
                  rows={4}
                  value={f.text}
                  placeholder="What did you work on or complete today?"
                  onChange={e => setF({ ...f, text: e.target.value })}
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Time spent (hours)">
                  <Input
                    type="number"
                    min={0}
                    max={24}
                    step={0.25}
                    placeholder="e.g. 2.5"
                    value={f.hours}
                    onChange={e => setF({ ...f, hours: e.target.value as any })}
                  />
                </Field>
                <Field label="Learning notes" className="sm:col-span-2">
                  <Textarea
                    rows={2}
                    value={f.learned}
                    placeholder="Key takeaways or concepts learned..."
                    onChange={e => setF({ ...f, learned: e.target.value })}
                  />
                </Field>
              </div>

              <details
                open={more}
                onToggle={e => setMore((e.target as HTMLDetailsElement).open)}
                className="rounded-lg border border-brand-line bg-brand-bg/40 px-3 py-2.5"
              >
                <summary className="cursor-pointer text-xs font-medium text-brand-deep">
                  Additional details (optional)
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="General LeetCode solved (unlinked)">
                    <Input
                      type="number"
                      min={0}
                      placeholder="e.g. 2"
                      value={f.lc}
                      onChange={e => setF({ ...f, lc: e.target.value as any })}
                    />
                  </Field>
                  <Field label="Topics covered">
                    <Input
                      placeholder="Graphs, Attention"
                      value={f.topics}
                      onChange={e => setF({ ...f, topics: e.target.value })}
                    />
                  </Field>
                  <Field label="GitHub / Project link" className="sm:col-span-2">
                    <Input
                      placeholder="https://github.com/..."
                      value={f.link}
                      onChange={e => setF({ ...f, link: e.target.value })}
                    />
                  </Field>
                </div>
              </details>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <Button onClick={() => saveGeneral(false)} disabled={busy}>
                  {busy ? 'Saving…' : existsGeneral && !existsGeneral.is_draft ? 'Update' : 'Save Update'}
                </Button>
                <Button variant="secondary" onClick={() => saveGeneral(true)} disabled={busy}>
                  Save Draft
                </Button>
                {msg && <span className="text-xs font-medium text-brand-deep">{msg}</span>}
              </div>
            </Card>
          )}

          {selectedGoal && isLeetCodeGoal(selectedGoal) && lcPreview && (
            <Card className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-brand-line pb-3">
                <div>
                  <Badge tone="mint">LeetCode Tracker</Badge>
                  <h2 className="mt-1.5 text-lg font-semibold text-brand-ink">{selectedGoal.title}</h2>
                  <p className="tabular-nums text-xs text-brand-muted">
                    {fmtD(selectedGoal.start_date!)} → {fmtD(selectedGoal.end_date!)}
                  </p>
                </div>
                <span className="tabular-nums text-sm font-semibold text-brand-deep">{lcPreview.pct}%</span>
              </div>

              <div className="space-y-2">
                <Progress value={lcPreview.pct} />
                <div className="tabular-nums flex items-center justify-between text-xs text-brand-body">
                  <span>
                    <strong className="text-brand-ink">{lcPreview.completed}</strong> completed
                  </span>
                  <span>
                    <strong className="text-amber-700">{lcPreview.remaining}</strong> remaining
                  </span>
                  <span>
                    <strong className="text-brand-ink">{lcPreview.target}</strong> target
                  </span>
                </div>
              </div>

              <Field
                label={`Questions solved on ${fmtD(date)} *`}
                hint="Enter only the count of questions solved on this date."
              >
                <Input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="e.g. 3"
                  value={lcCount}
                  onChange={e => setLcCount(e.target.value)}
                />
              </Field>

              <div className="flex flex-wrap items-center gap-2.5">
                <Button onClick={() => saveGoalEntry(false)} disabled={busy}>
                  {busy ? 'Saving…' : existsGoalLog ? 'Update Count' : 'Save Count'}
                </Button>
                {existsGoalLog?.id && (
                  <Button
                    variant="danger"
                    onClick={async () => {
                      if (confirm('Remove this LeetCode entry for this date?')) {
                        await api.deleteGoalLog(existsGoalLog.id!)
                        await api.syncLeetCodeGoalProgress(selectedGoal)
                        setLcCount('')
                        setExistsGoalLog(null)
                        reloadAll()
                      }
                    }}
                  >
                    <Trash2 size={14} />
                    Remove
                  </Button>
                )}
                {msg && <span className="text-xs font-medium text-brand-deep">{msg}</span>}
              </div>
            </Card>
          )}

          {selectedGoal && isTransformersGoal(selectedGoal) && (
            <Card className="space-y-4">
              <div>
                <Badge tone="mint">Transformers Learning Tracker</Badge>
                <h2 className="mt-1.5 text-lg font-semibold text-brand-ink">{selectedGoal.title}</h2>
                <p className="text-xs text-brand-muted">
                  Saved weekly topics and checklist tasks sync directly with Goals.
                </p>
              </div>
              <TransformersTracker
                goal={selectedGoal}
                mine={true}
                initialWeek={date}
                onSync={reloadAll}
                onGoalCompleted={title => setCelebrate(title)}
              />
            </Card>
          )}

          {selectedGoal && !isLeetCodeGoal(selectedGoal) && !isTransformersGoal(selectedGoal) && (
            <Card className="space-y-4">
              <div>
                <Badge>{selectedGoal.category}</Badge>
                <h2 className="mt-1.5 text-lg font-semibold text-brand-ink">{selectedGoal.title}</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Time spent (hours)">
                  <Input
                    type="number"
                    min={0}
                    max={24}
                    step={0.25}
                    placeholder="e.g. 1.5"
                    value={goalHours}
                    onChange={e => setGoalHours(e.target.value)}
                  />
                </Field>
                <Field label="Learning notes" className="sm:col-span-2">
                  <Textarea
                    rows={3}
                    value={goalNotes}
                    placeholder="Notes for this goal..."
                    onChange={e => setGoalNotes(e.target.value)}
                  />
                </Field>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <Button onClick={() => saveGoalEntry(false)} disabled={busy}>
                  {busy ? 'Saving…' : existsGoalLog ? 'Update Log' : 'Save Log'}
                </Button>
                {msg && <span className="text-xs font-medium text-brand-deep">{msg}</span>}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-5 lg:col-span-4">
          <Card className="space-y-3 p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
              Saved on {fmtD(date)}
            </h2>
            {!existsGeneral && !logsOnSelectedDate.length && (
              <p className="text-xs text-brand-muted">No logs saved on this date yet.</p>
            )}
            <div className="space-y-2">
              {existsGeneral && (
                <div
                  onClick={() => setMode('general')}
                  className={`cursor-pointer rounded-lg border p-2.5 text-xs transition ${
                    mode === 'general' ? 'border-brand-deep bg-brand-soft/50' : 'border-brand-line hover:bg-brand-bg'
                  }`}
                >
                  <div className="flex items-center justify-between font-medium text-brand-ink">
                    <span>General Daily Update</span>
                    <span className="tabular-nums text-brand-muted">
                      {[existsGeneral.hours ? `${existsGeneral.hours}h` : '', existsGeneral.leetcode_count ? `${existsGeneral.leetcode_count} LC` : '']
                        .filter(Boolean)
                        .join(' · ') || 'Saved'}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-brand-body">
                    {existsGeneral.completed || existsGeneral.tasks || existsGeneral.learned || '—'}
                  </p>
                </div>
              )}
              {logsOnSelectedDate.map(l => (
                <div
                  key={l.id}
                  onClick={() => setMode(l.goal_id)}
                  className={`cursor-pointer rounded-lg border p-2.5 text-xs transition ${
                    mode === l.goal_id ? 'border-brand-deep bg-brand-soft/50' : 'border-brand-line hover:bg-brand-bg'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-brand-ink">{goalTitle(l.goal_id)}</p>
                      <p className="tabular-nums text-brand-muted">
                        {[
                          l.questions_solved ? `${l.questions_solved} solved` : '',
                          l.hours_spent ? `${l.hours_spent}h` : '',
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'Notes saved'}
                      </p>
                    </div>
                    <button
                      type="button"
                      title="Delete goal log"
                      className="rounded p-1 text-brand-muted hover:bg-red-50 hover:text-red-600"
                      onClick={async e => {
                        e.stopPropagation()
                        if (confirm('Delete this goal log?')) {
                          await api.deleteGoalLog(l.id!)
                          const g = mineGoals.find(x => x.id === l.goal_id)
                          if (g && isLeetCodeGoal(g)) await api.syncLeetCodeGoalProgress(g)
                          reloadAll()
                        }
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-3 p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
              Recent History
            </h2>
            <div className="max-h-[420px] divide-y divide-brand-line overflow-y-auto pr-1">
              {!combinedRecent.length && <p className="py-2 text-xs text-brand-muted">No updates yet.</p>}
              {combinedRecent.map(item => {
                if (item.kind === 'general') {
                  const u = item.row
                  const text = u.completed || u.tasks || u.worked_on || u.learned || ''
                  return (
                    <div key={`u-${u.date}`} className="flex items-start gap-2 py-2.5 text-xs">
                      <button
                        className="min-w-0 flex-1 text-left"
                        onClick={() => {
                          setDate(u.date)
                          setMode('general')
                        }}
                      >
                        <div className="flex items-center gap-1.5 font-medium text-brand-ink">
                          <span className="tabular-nums">{fmtD(u.date)}</span>
                          <span className="text-brand-muted">· General</span>
                          {u.is_draft && <Badge tone="amber">draft</Badge>}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-brand-body">{text || '—'}</p>
                      </button>
                      <button
                        title="Delete"
                        className="rounded p-1 text-brand-muted hover:bg-red-50 hover:text-red-600"
                        onClick={async () => {
                          if (confirm('Delete this update?')) {
                            await api.deleteUpdate(u.id!)
                            reloadUpdates()
                            if (u.date === date) setDate(today())
                          }
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )
                }

                const l = item.row
                return (
                  <div key={`g-${l.id}`} className="py-2.5 text-xs">
                    <button
                      className="w-full text-left"
                      onClick={() => {
                        setDate(l.date)
                        setMode(l.goal_id)
                      }}
                    >
                      <div className="flex items-center justify-between gap-2 font-medium text-brand-ink">
                        <span className="truncate">
                          {fmtD(l.date)} · {item.goal?.title ?? 'Goal'}
                        </span>
                        <span className="tabular-nums shrink-0 text-brand-deep">
                          {l.questions_solved ? `${l.questions_solved} LC` : l.hours_spent ? `${l.hours_spent}h` : 'Notes'}
                        </span>
                      </div>
                      {l.learning_notes && (
                        <p className="mt-0.5 line-clamp-2 text-brand-body">{l.learning_notes}</p>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>

      <CelebrationBanner title={celebrate} onClose={() => setCelebrate(null)} />
    </Page>
  )
}
