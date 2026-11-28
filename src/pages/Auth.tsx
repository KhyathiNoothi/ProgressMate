import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { BrandMark, Button, Field, Input, Tilt3DCard } from '../components/ui'

export default function Auth() {
  const [signup, setSignup] = useState(false)
  const [f, setF] = useState({ name: '', email: '', password: '' })
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    const { data, error } = signup
      ? await supabase.auth.signUp({
          email: f.email,
          password: f.password,
          options: { data: { display_name: f.name } },
        })
      : await supabase.auth.signInWithPassword({ email: f.email, password: f.password })
    if (error)
      setMsg(
        error.message.includes('Database error')
          ? 'Workspace is full – only 2 members are allowed.'
          : error.message
      )
    else if (signup && !data.session) setMsg('Account created. Confirm your email, then sign in.')
    setBusy(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Tilt3DCard className="w-full max-w-sm animate-fade p-6" intensity={1.8}>
        <div className="mb-6 flex items-center gap-3">
          <BrandMark size={36} />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-brand-ink">ProgressMate</h1>
            <p className="text-xs text-brand-muted">
              {signup ? 'Create your workspace account' : 'Sign in to your shared workspace'}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3.5">
          {signup && (
            <Field label="Display name">
              <Input required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
            </Field>
          )}
          <Field label="Email">
            <Input
              type="email"
              required
              value={f.email}
              onChange={e => setF({ ...f, email: e.target.value })}
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              minLength={6}
              required
              value={f.password}
              onChange={e => setF({ ...f, password: e.target.value })}
            />
          </Field>
          {msg && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{msg}</p>}
          <Button className="w-full" disabled={busy}>
            {signup ? 'Create account' : 'Sign in'}
          </Button>
        </form>

        <div className="mt-5 border-t border-brand-line pt-4 text-center">
          <button
            className="text-xs font-medium text-brand-muted transition hover:text-brand-deep"
            onClick={() => {
              setSignup(!signup)
              setMsg('')
            }}
          >
            {signup ? 'Already have an account? Sign in' : 'New to ProgressMate? Create account'}
          </button>
        </div>
      </Tilt3DCard>
    </div>
  )
}
