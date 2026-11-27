import type { Goal, Update } from './types'
export const cn = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ')
export const CATS = ['DSA', 'LeetCode', 'Transformers', 'GenAI', 'Practical Implementation']
const p2 = (n: number) => String(n).padStart(2, '0')
export const fmt = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
export const today = () => fmt(new Date())
export const thisMonth = () => today().slice(0, 7)
export const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d }
export const monthRange = (m: string) => { const [y, mo] = m.split('-').map(Number); const days = new Date(y, mo, 0).getDate(); return { start: `${m}-01`, end: `${m}-${p2(days)}`, days } }
export const elapsedDays = (m: string) => (m === thisMonth() ? new Date().getDate() : monthRange(m).days)
export const goalPct = (g: Goal) => Math.min(100, Math.round((g.progress / Math.max(1, g.target)) * 100))
export function summarize(u: Update[], g: Goal[]) {
  const hours = u.reduce((a, x) => a + Number(x.hours), 0)
  const lc = u.reduce((a, x) => a + x.leetcode_count, 0)
  const pct = g.length ? Math.round(g.reduce((a, x) => a + goalPct(x), 0) / g.length) : 0
  return { hours, lc, days: u.length, done: g.filter(x => x.status === 'completed').length, total: g.length, pct }
}
const ymd = (s: string) => s.split('-').map(Number)
export const addDays = (s: string, n: number) => { const [y, m, d] = ymd(s); return fmt(new Date(y, m - 1, d + n)) }
export const weekStart = (s: string) => { const [y, m, d] = ymd(s); return addDays(s, -((new Date(y, m - 1, d).getDay() + 6) % 7)) }
export const fmtD = (s: string) => { const [y, m, d] = ymd(s); return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
export const daysBetween = (a: string, b: string) => Math.round((+new Date(b) - +new Date(a)) / 864e5)
