import { supabase } from '../lib/supabase'
import type { Goal, Profile, Update } from '../lib/types'

export const api = {
  profiles: async (): Promise<Profile[]> => (await supabase.from('profiles').select('*')).data ?? [],
  goals: async (month: string): Promise<Goal[]> => (await supabase.from('goals').select('*').eq('month', month).order('deadline')).data ?? [],
  saveGoal: (g: Partial<Goal>) => supabase.from('goals').upsert(g),
  deleteGoal: (id: string) => supabase.from('goals').delete().eq('id', id),
  updates: async (start: string, end: string): Promise<Update[]> =>
    (await supabase.from('daily_updates').select('*').gte('date', start).lte('date', end).order('date', { ascending: false })).data ?? [],
  updateOn: async (uid: string, date: string): Promise<Update | null> =>
    (await supabase.from('daily_updates').select('*').eq('user_id', uid).eq('date', date).maybeSingle()).data,
  saveUpdate: (u: Update) => supabase.from('daily_updates').upsert(u, { onConflict: 'user_id,date' }),
  upload: async (uid: string, file: File) => {
    const path = `${uid}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`
    const { error } = await supabase.storage.from('attachments').upload(path, file)
    if (error) throw error
    return path
  },
  fileUrl: async (path: string) => (await supabase.storage.from('attachments').createSignedUrl(path, 3600)).data?.signedUrl,
}
