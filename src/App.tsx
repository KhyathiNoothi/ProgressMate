import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { api } from './services/api'
import { Ctx, useLive } from './hooks'
import type { Profile } from './lib/types'
import Layout from './components/Layout'
import Auth from './pages/Auth'
import Goals from './pages/Goals'
import Daily from './pages/Daily'
import ProgressPage from './pages/Progress'
import Insights from './pages/Insights'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  const uid = session?.user.id ?? ''
  const { data: raw } = useLive<Profile>('profiles', () => (uid ? api.profiles() : Promise.resolve([])), [uid])
  const profiles = [...raw].sort(p => (p.id === uid ? -1 : 1)) // current user first
  if (session === undefined) return <div className="p-10 text-brand-muted">Loading…</div>
  if (!session) return <Auth />
  if (!profiles.length) return <div className="p-10 text-brand-muted">Setting up your workspace…</div>
  return (
    <Ctx.Provider value={{ uid, profiles }}>
      <Routes><Route element={<Layout />}>
        <Route index element={<Goals />} /><Route path="daily" element={<Daily />} />
        <Route path="progress" element={<ProgressPage />} /><Route path="insights" element={<Insights />} />
      </Route></Routes>
    </Ctx.Provider>)
}
