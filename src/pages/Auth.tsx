import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button, Card, Field, Input } from '../components/ui'
export default function Auth() {
  const [signup, setSignup] = useState(false)
  const [f, setF] = useState({ name: '', email: '', password: '' })
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg('')
    const { data, error } = signup
      ? await supabase.auth.signUp({ email: f.email, password: f.password, options: { data: { display_name: f.name } } })
      : await supabase.auth.signInWithPassword({ email: f.email, password: f.password })
    if (error) setMsg(error.message.includes('Database error') ? 'Workspace is full – only 2 members are allowed.' : error.message)
    else if (signup && !data.session) setMsg('Account created. Confirm your email, then sign in.')
    setBusy(false)
  }
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm animate-fade">
        <h1 className="mb-1 bg-gradient-to-r from-[#2F7A6E] to-[#4F9D91] bg-clip-text text-2xl font-bold text-transparent">ProgressMate</h1>
        <p className="mb-5 text-sm text-brand-muted">{signup ? 'Create your account' : 'Sign in to your shared workspace'}</p>
        <form onSubmit={submit} className="space-y-3">
          {signup && <Field label="Display name"><Input required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>}
          <Field label="Email"><Input type="email" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Password"><Input type="password" minLength={6} required value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></Field>
          {msg && <p className="text-sm text-amber-600">{msg}</p>}
          <Button className="w-full" disabled={busy}>{signup ? 'Register' : 'Sign in'}</Button>
        </form>
        <button className="mt-4 text-sm text-brand-muted hover:text-brand-ink" onClick={() => { setSignup(!signup); setMsg('') }}>{signup ? 'Have an account? Sign in' : 'New here? Register'}</button>
      </Card>
    </div>)
}
