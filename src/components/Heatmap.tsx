import { daysAgo, fmt } from '../lib/utils'
const LV = ['bg-[#EAF2ED]', 'bg-[#C8E9D8]', 'bg-[#9BD1BD]', 'bg-[#6DB5A5]', 'bg-[#3F867A]']
/** data: date -> intensity level 0..4. Shows the last 15 weeks. */
export default function Heatmap({ data }: { data: Record<string, number> }) {
  const start = daysAgo(104)
  const cells = [...Array(start.getDay()).fill(null), ...Array.from({ length: 105 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return fmt(d) })]
  return (
    <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto">
      {cells.map((d, i) => d ? <div key={i} title={d} className={`h-3.5 w-3.5 rounded-sm ${LV[data[d] ?? 0]}`} /> : <div key={i} className="h-3.5 w-3.5" />)}
    </div>)
}
