import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import type { Profile } from './lib/types'

export const Ctx = createContext<{ uid: string; profiles: Profile[] }>({ uid: '', profiles: [] })
export const useCtx = () => useContext(Ctx)

/** Loads rows and re-loads whenever the table changes in Supabase Realtime. */
export function useLive<T>(table: string, fetcher: () => Promise<T[]>, deps: any[]) {
  const [data, setData] = useState<T[]>([])
  const load = useCallback(() => { fetcher().then(setData) }, deps)
  useEffect(() => {
    load()
    const ch = supabase.channel(`${table}-${Math.random()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, load).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load])
  return { data, reload: load }
}
