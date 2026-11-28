import React, { useId } from 'react'
import { Trophy, X } from 'lucide-react'
import { cn } from '../lib/utils'

const field =
  'w-full rounded-lg border border-brand-line bg-white px-3 py-2 text-sm text-brand-ink placeholder:text-brand-muted transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15'

export const Card = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'rounded-xl border border-brand-line bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md',
      className
    )}
    {...p}
  />
)

/** Crisp, non-blurry elevated card with smooth hover lift. */
export const Tilt3DCard = ({
  className,
  children,
  intensity: _intensity,
  ...p
}: React.HTMLAttributes<HTMLDivElement> & { intensity?: number }) => (
  <div
    className={cn(
      'rounded-xl border border-brand-line bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-hover hover:shadow-md',
      className
    )}
    {...p}
  >
    {children}
  </div>
)

export const Button = ({
  className,
  variant,
  ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'ghost' | 'danger' | 'secondary' }) => (
  <button
    className={cn(
      'inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
      variant === 'ghost'
        ? 'text-brand-body hover:bg-brand-hover/70 hover:text-brand-ink'
        : variant === 'secondary'
          ? 'border border-brand-line bg-white text-brand-ink hover:border-brand-hover hover:bg-brand-bg'
          : variant === 'danger'
            ? 'text-red-500 hover:bg-red-50'
            : 'bg-brand-primary text-white hover:bg-brand-deep',
      className
    )}
    {...p}
  />
)

export const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} className={cn(field, p.className)} />
)
export const Textarea = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea rows={3} {...p} className={cn(field, p.className)} />
)
export const Select = (p: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} className={cn(field, p.className)} />
)

export const Field = ({
  label,
  children,
  className,
  hint,
}: {
  label: string
  children: React.ReactNode
  className?: string
  hint?: string
}) => (
  <div className={className}>
    <label className="mb-1.5 block text-xs font-medium text-brand-muted">{label}</label>
    {children}
    {hint && <p className="mt-1 text-[11px] text-brand-muted">{hint}</p>}
  </div>
)

export const Badge = ({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: 'neutral' | 'mint' | 'amber' | 'red'
  className?: string
  children: React.ReactNode
}) => {
  const tones = {
    neutral: 'bg-brand-bg text-brand-body border-brand-line',
    mint: 'bg-brand-soft text-brand-deep border-brand-hover',
    amber: 'bg-amber-50 text-amber-700 border-amber-200/80',
    red: 'bg-red-50 text-red-600 border-red-200/80',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

export const Progress = ({ value }: { value: number }) => {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-brand-soft">
      <div
        className="h-full rounded-full bg-brand-primary transition-all duration-500 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

/** Clean spacious KPI stat matching ProgressMate's clean dashboard style. */
export const Stat = ({
  label,
  value,
  sub,
  boxed = false,
}: {
  label: string
  value: React.ReactNode
  sub?: string
  boxed?: boolean
}) => (
  <div className={boxed ? 'rounded-xl border border-brand-line bg-white p-4 shadow-sm' : ''}>
    <p className="text-xs text-brand-muted">{label}</p>
    <p className="tabular-nums mt-0.5 text-2xl font-semibold text-brand-ink">{value}</p>
    {sub && <p className="mt-0.5 text-xs text-brand-muted">{sub}</p>}
  </div>
)

export function Ring3D({
  value,
  size = 56,
  stroke = 5,
  label,
  sub,
}: {
  value: number
  size?: number
  stroke?: number
  label?: string
  sub?: string
}) {
  const gradId = useId()
  const clamped = Math.min(100, Math.max(0, value))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (clamped / 100) * c

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4F9D91" />
              <stop offset="100%" stopColor="#2F7A6E" />
            </linearGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#DDF3E7" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="tabular-nums text-xs font-semibold text-brand-ink">{clamped}%</span>
        </div>
      </div>
      {label && <span className="text-xs font-medium text-brand-ink">{label}</span>}
      {sub && <span className="text-[11px] text-brand-muted">{sub}</span>}
    </div>
  )
}

export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-primary to-brand-deep text-white shadow-sm"
      aria-hidden="true"
    >
      <svg width={Math.round(size * 0.56)} height={Math.round(size * 0.56)} viewBox="0 0 24 24" fill="none">
        <path d="M5 12.5L9.5 17L19 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

const CONFETTI = [
  { tx: '-36px', ty: '-28px', color: '#4F9D91' },
  { tx: '38px', ty: '-26px', color: '#2F7A6E' },
  { tx: '-24px', ty: '-42px', color: '#9BD1BD' },
  { tx: '26px', ty: '-40px', color: '#F59E0B' },
  { tx: '-44px', ty: '8px', color: '#10B981' },
  { tx: '44px', ty: '10px', color: '#4F9D91' },
]

/** Crisp, non-blurry goal completion celebration toast with small 3D badge flip & confetti. */
export function CelebrationBanner({
  title,
  onClose,
}: {
  title: string | null
  onClose: () => void
}) {
  if (!title) return null
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-pop">
      <div className="relative flex items-center gap-3.5 rounded-xl border border-brand-hover bg-white px-4 py-3.5 shadow-lg">
        <div className="icon-3d-wrap relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-deep">
          <div className="icon-3d-flip animate-badge-flip">
            <Trophy size={20} />
          </div>
          {CONFETTI.map((c, i) => (
            <span
              key={i}
              aria-hidden="true"
              className="animate-confetti pointer-events-none absolute h-2 w-2 rounded-full"
              style={
                {
                  backgroundColor: c.color,
                  '--tx': c.tx,
                  '--ty': c.ty,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
        <div className="pr-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-deep">Goal Completed</p>
          <p className="text-sm font-medium text-brand-ink">{title}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-brand-muted hover:bg-brand-bg hover:text-brand-ink"
          aria-label="Close"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  )
}

export const Page = ({
  title,
  sub,
  right,
  children,
}: {
  title: string
  sub?: string
  right?: React.ReactNode
  children: React.ReactNode
}) => (
  <div className="animate-fade space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-brand-ink">{title}</h1>
        {sub && <p className="text-sm text-brand-muted">{sub}</p>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
    {children}
  </div>
)
