import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { api } from '../services/api'
import { useCtx, useLive } from '../hooks'
import type { Update } from '../lib/types'
import { daysAgo, fmt, fmtD, today } from '../lib/utils'
import { Button, Card, Field, Input, Page, Textarea } from '../components/ui'

const blank = () => ({ text: '', hours: '' as number | '', lc: '' as number | '', topics: '', link: '' })
type F = ReturnType<typeof blank>
const toForm = (u: Update): F => ({ text: u.completed || u.tasks || u.worked_on || '', hours: u.hours || '', lc: u.leetcode_count || '', topics: u.topics.join(', '), link: u.github_links.join(', ') })
const hasDetails = (f: F) => !!(f.hours || f.lc || f.topics.trim() || f.link.trim())
const links = (s: string) => s.split(/[,\s]+/).map(x => x.trim()).filter(Boolean)

export default function Daily() {
  const { uid } = useCtx()
  const [date, setDate] = useState(today())
  const [f, setF] = useState<F>(blank()); const [more, setMore] = useState(false)
  const [exists, setExists] = useState<Update | null>(null)
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  const { data: recent, reload } = useLive<Update>('daily_updates', () => api.updates(fmt(daysAgo(90)), today()), [])
  const mine = recent.filter(u => u.user_id === uid)

  useEffect(() => {
    setMsg('')
    api.updateOn(uid, date).then(u => { const nf = u ? toForm(u) : blank(); setExists(u); setF(nf); setMore(hasDetails(nf)) })
  }, [date, uid])

  const save = async (draft: boolean) => {
    if (!draft && !f.text.trim()) return setMsg("Today's Progress is required to save an update.")
    if (draft && !f.text.trim() && !hasDetails(f)) return setMsg('Nothing to save yet.')
    setBusy(true); setMsg('')
    try {
      // Only the fields on this form are sent, so other saved columns (files, older fields) stay untouched.
      const { error } = await api.saveUpdate({ user_id: uid, date, tasks: f.text.trim(), completed: f.text.trim(), hours: +f.hours || 0, leetcode_count: +f.lc || 0,
        topics: f.topics.split(',').map(t => t.trim()).filter(Boolean), github_links: links(f.link), is_draft: draft } as Update)
      if (error) throw error
      setMsg(draft ? 'Draft saved ✓' : 'Saved ✓'); reload(); setExists(await api.updateOn(uid, date))
    } catch (e: any) { setMsg(e.message ?? 'Save failed') }
    setBusy(false)
  }

  return (
    <Page title="Daily Work Update" sub="One box is all you need. Add details only if you want to."
      right={<Input type="date" className="w-44" max={today()} value={date} onChange={e => setDate(e.target.value)} />}>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-4 lg:col-span-2">
          <p className={`rounded-lg px-3 py-2 text-sm ${exists ? 'bg-amber-50 text-amber-600' : 'bg-brand-soft text-brand-deep'}`}>
            {exists ? (exists.is_draft ? `Editing your saved draft for ${fmtD(date)}.` : `You already have an update for ${fmtD(date)}. Saving will edit it.`) : `New update for ${fmtD(date)}.`}
          </p>
          <Field label="Today's Progress *">
            <Textarea rows={6} value={f.text} placeholder="What did you work on, complete, or learn today?" onChange={e => setF({ ...f, text: e.target.value })} />
          </Field>
          <details open={more} onToggle={e => setMore((e.target as HTMLDetailsElement).open)} className="rounded-lg border border-brand-line p-3">
            <summary className="cursor-pointer text-sm font-medium text-brand-deep">+ Add More Details (Optional)</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Time Spent"><Input type="number" min={0} max={24} step={0.25} placeholder="Hours, e.g. 1.5" value={f.hours} onChange={e => setF({ ...f, hours: e.target.value as any })} /></Field>
              <Field label="LeetCode Questions Solved"><Input type="number" min={0} placeholder="e.g. 3" value={f.lc} onChange={e => setF({ ...f, lc: e.target.value as any })} /></Field>
              <Field label="Topics Covered"><Input placeholder="Graphs, Attention" value={f.topics} onChange={e => setF({ ...f, topics: e.target.value })} /></Field>
              <Field label="GitHub / Project Link"><Input placeholder="https://github.com/..." value={f.link} onChange={e => setF({ ...f, link: e.target.value })} /></Field>
            </div>
          </details>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => save(false)} disabled={busy}>{busy ? 'Saving…' : exists && !exists.is_draft ? 'Update' : 'Save Update'}</Button>
            <Button variant="ghost" onClick={() => save(true)} disabled={busy}>Save Draft</Button>
            <span className="text-sm text-brand-muted">{msg}</span>
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold text-brand-ink">My update history</h2>
          <div className="space-y-2">
            {!mine.length && <p className="text-sm text-brand-muted">Nothing yet.</p>}
            {mine.map(u => {
              const text = u.completed || u.tasks || u.worked_on || ''
              const bits = [u.hours ? `${u.hours}h` : '', u.leetcode_count ? `${u.leetcode_count} LeetCode` : '', u.topics.length ? `Topics: ${u.topics.join(', ')}` : ''].filter(Boolean)
              return (
                <div key={u.date} className={`rounded-lg border p-3 text-sm transition hover:border-brand-primary ${u.date === date ? 'border-brand-primary bg-brand-soft' : 'border-brand-line'}`}>
                  <div className="flex items-start gap-2">
                    <button className="flex-1 text-left" onClick={() => setDate(u.date)}>
                      <p className="font-medium text-brand-ink">{fmtD(u.date)} {u.is_draft && <span className="ml-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-600">draft</span>}</p>
                      <p className="mt-1 line-clamp-3 whitespace-pre-line text-brand-body">{text || '—'}</p>
                      {!!bits.length && <p className="mt-1 text-xs text-brand-muted">{bits.join(' · ')}</p>}
                    </button>
                    <button title="Delete" className="text-red-500" onClick={async () => { if (confirm('Delete this update?')) { await api.deleteUpdate(u.id!); reload(); if (u.date === date) setDate(today()) } }}><Trash2 size={14} /></button>
                  </div>
                  {u.github_links.map(l => <a key={l} href={l} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-brand-deep underline">{l}</a>)}
                </div>)
            })}
          </div>
        </Card>
      </div>
    </Page>)
}
