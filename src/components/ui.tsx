import React from 'react'
import { cn } from '../lib/utils'
const field = 'w-full rounded-lg border border-brand-line bg-white px-3 py-2 text-sm text-brand-ink placeholder:text-brand-muted focus:border-brand-primary focus:outline-none'
export const Card = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn('rounded-xl border border-brand-line bg-white p-5 shadow-sm', className)} {...p} />
export const Button = ({ className, variant, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'ghost' | 'danger' }) => (
  <button className={cn('inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50',
    variant === 'ghost' ? 'text-brand-body hover:bg-brand-hover' : variant === 'danger' ? 'text-red-500 hover:bg-red-50' : 'bg-brand-primary text-white hover:bg-brand-deep', className)} {...p} />)
export const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cn(field, p.className)} />
export const Textarea = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea rows={3} {...p} className={cn(field, p.className)} />
export const Select = (p: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cn(field, p.className)} />
export const Field = ({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) => <div className={className}><label className="mb-1 block text-xs font-medium text-brand-muted">{label}</label>{children}</div>
export const Progress = ({ value }: { value: number }) => <div className="h-2 w-full overflow-hidden rounded-full bg-brand-soft"><div className="h-full rounded-full bg-brand-primary transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>
export const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => <div><p className="text-xs text-brand-muted">{label}</p><p className="text-2xl font-semibold text-brand-ink">{value}</p></div>
export const Page = ({ title, sub, right, children }: { title: string; sub?: string; right?: React.ReactNode; children: React.ReactNode }) => (
  <div className="animate-fade space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold text-brand-ink">{title}</h1>{sub && <p className="text-sm text-brand-muted">{sub}</p>}</div>{right}</div>
    {children}
  </div>)
