import { supabase } from '../lib/supabase'
import type { Category, Goal, Profile, Update, WeeklyTask } from '../lib/types'

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
  allGoals: async (): Promise<Goal[]> => (await supabase.from('goals').select('*').order('end_date')).data ?? [],
  categories: async (): Promise<Category[]> => (await supabase.from('categories').select('*').order('name')).data ?? [],
  addCategories: (names: string[]) => supabase.from('categories').upsert(names.map(name => ({ name })), { onConflict: 'workspace_id,name', ignoreDuplicates: true }),
  deleteCategory: (id: string) => supabase.from('categories').delete().eq('id', id),
  tasks: async (goalId: string): Promise<WeeklyTask[]> => (await supabase.from('weekly_tasks').select('*').eq('goal_id', goalId).order('created_at')).data ?? [],
  saveTask: (t: Partial<WeeklyTask>) => supabase.from('weekly_tasks').upsert(t),
  deleteTask: (id: string) => supabase.from('weekly_tasks').delete().eq('id', id),
  allTasks: async (start: string, end: string): Promise<WeeklyTask[]> => (await supabase.from('weekly_tasks').select('*').gte('week_start', start).lte('week_start', end)).data ?? [],
  saveTasks: (ts: Partial<WeeklyTask>[]) => supabase.from('weekly_tasks').insert(ts),
  deleteUpdate: (id: string) => supabase.from('daily_updates').delete().eq('id', id),
}
