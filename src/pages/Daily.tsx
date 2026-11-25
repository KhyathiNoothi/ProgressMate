import { useEffect, useState } from 'react'
import { Paperclip } from 'lucide-react'
import { api } from '../services/api'
import { useCtx, useLive } from '../hooks'
import type { Update } from '../lib/types'
import { daysAgo, fmt, today } from '../lib/utils'
import { Button, Card, Field, Input, Page, Textarea } from '../components/ui'

const blank = () => ({ tasks: '', count: 0, lc: '', topics: '', practical: '', hours: 0, challenges: '', gh: '', files: [] as Update['files'] })
const toForm = (u: Update) => ({ tasks: u.tasks, count: u.leetcode_count, lc: u.leetcode_links.join('\n'), topics: u.topics.join(', '), practical: u.practical, hours: u.hours, challenges: u.challenges, gh: u.github_links.join('\n'), files: u.files })
const lines = (s: string) => s.split('\n').map(x => x.trim()).filter(Boolean)

export default function Daily() {
  const { uid } = useCtx()
  const [date, setDate] = useState(today())
  const [f, setF] = useState(blank()); const [pending, setPending] = useState<File[]>([])
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  const { data: recent, reload } = useLive<Update>('daily_updates', () => api.updates(fmt(daysAgo(60)), today()), [])
  const mine = recent.filter(u => u.user_id === uid)

  useEffect(() => { setPending([]); setMsg(''); api.updateOn(uid, date).then(u => setF(u ? toForm(u) : blank())) }, [date, uid])

  const save = async () => {
    setBusy(true); setMsg('')
    try {
      const up = await Promise.all(pending.map(async file => ({ name: file.name, path: await api.upload(uid, file) })))
      const { error } = await api.saveUpdate({ user_id: uid, date, tasks: f.tasks, leetcode_count: +f.count, leetcode_links: lines(f.lc),
        topics: f.topics.split(',').map(t => t.trim()).filter(Boolean), practical: f.practical, hours: +f.hours, challenges: f.challenges,
        github_links: lines(f.gh), files: [...f.files, ...up] })
      if (error) throw error
      setF({ ...f, files: [...f.files, ...up] }); setPending([]); setMsg('Saved ✓'); reload()
    } catch (e: any) { setMsg(e.message ?? 'Save failed') }
    setBusy(false)
  }
  const open = async (path: string) => { const url = await api.fileUrl(path); if (url) window.open(url, '_blank') }

  return (
    <Page title="Daily Work Update" sub="Pick any date to add or edit that day's update."
      right={<Input type="date" className="w-44" max={today()} value={date} onChange={e => setDate(e.target.value)} />}>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-3 lg:col-span-2">
          <Field label="Tasks completed"><Textarea value={f.tasks} onChange={e => setF({ ...f, tasks: e.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="LeetCode problems solved"><Input type="number" min={0} value={f.count} onChange={e => setF({ ...f, count: +e.target.value })} /></Field>
            <Field label="Learning hours"><Input type="number" min={0} max={24} step={0.25} value={f.hours} onChange={e => setF({ ...f, hours: +e.target.value })} /></Field>
            <Field label="Topics studied (comma separated)"><Input value={f.topics} onChange={e => setF({ ...f, topics: e.target.value })} placeholder="Graphs, Attention" /></Field>
          </div>
          <Field label="LeetCode links (one per line)"><Textarea value={f.lc} onChange={e => setF({ ...f, lc: e.target.value })} /></Field>
          <Field label="Practical implementations"><Textarea value={f.practical} onChange={e => setF({ ...f, practical: e.target.value })} /></Field>
          <Field label="Challenges faced"><Textarea value={f.challenges} onChange={e => setF({ ...f, challenges: e.target.value })} /></Field>
          <Field label="GitHub links (one per line)"><Textarea value={f.gh} onChange={e => setF({ ...f, gh: e.target.value })} /></Field>
          <Field label="Attachments">
            <input type="file" multiple className="text-sm text-slate-400" onChange={e => setPending([...pending, ...Array.from(e.target.files ?? [])])} />
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {f.files.map(x => <button key={x.path} onClick={() => open(x.path)} className="flex items-center gap-1 rounded bg-white/10 px-2 py-1 hover:bg-white/20"><Paperclip size={12} />{x.name}</button>)}
              {pending.map(x => <span key={x.name} className="rounded bg-purple-500/20 px-2 py-1">{x.name} (will upload)</span>)}
            </div>
          </Field>
          <div className="flex items-center gap-3"><Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save update'}</Button><span className="text-sm text-slate-400">{msg}</span></div>
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold text-white">My recent updates</h2>
          <div className="space-y-2">
            {!mine.length && <p className="text-sm text-slate-500">Nothing yet.</p>}
            {mine.map(u => (
              <button key={u.date} onClick={() => setDate(u.date)} className={`w-full rounded-lg border p-3 text-left text-sm transition hover:border-purple-500 ${u.date === date ? 'border-purple-500 bg-purple-500/10' : 'border-white/10'}`}>
                <p className="font-medium text-white">{u.date}</p>
                <p className="text-xs text-slate-400">{u.hours}h · {u.leetcode_count} LC · {u.topics.slice(0, 3).join(', ')}</p>
              </button>))}
          </div>
        </Card>
      </div>
    </Page>)
}
