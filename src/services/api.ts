import { supabase } from '../lib/supabase'
import type { Category, Goal, GoalDailyLog, Profile, Update, WeeklyTask, WeeklyTopic } from '../lib/types'
import { calcLeetCodeStats, calcTransformersStats } from '../lib/utils'

export const api = {
  profiles: async (): Promise<Profile[]> => (await supabase.from('profiles').select('*')).data ?? [],
  goals: async (month: string): Promise<Goal[]> => (await supabase.from('goals').select('*').eq('month', month).order('deadline')).data ?? [],
  allGoals: async (): Promise<Goal[]> => (await supabase.from('goals').select('*').order('end_date')).data ?? [],
  saveGoal: (g: Partial<Goal>) => supabase.from('goals').upsert(g),
  deleteGoal: (id: string) => supabase.from('goals').delete().eq('id', id),

  updates: async (start: string, end: string): Promise<Update[]> =>
    (await supabase.from('daily_updates').select('*').gte('date', start).lte('date', end).order('date', { ascending: false })).data ?? [],
  updateOn: async (uid: string, date: string): Promise<Update | null> =>
    (await supabase.from('daily_updates').select('*').eq('user_id', uid).eq('date', date).maybeSingle()).data,
  saveUpdate: (u: Update) => supabase.from('daily_updates').upsert(u, { onConflict: 'user_id,date' }),
  deleteUpdate: (id: string) => supabase.from('daily_updates').delete().eq('id', id),

  upload: async (uid: string, file: File) => {
    const path = `${uid}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`
    const { error } = await supabase.storage.from('attachments').upload(path, file)
    if (error) throw error
    return path
  },
  fileUrl: async (path: string) => (await supabase.storage.from('attachments').createSignedUrl(path, 3600)).data?.signedUrl,

  categories: async (): Promise<Category[]> => (await supabase.from('categories').select('*').order('name')).data ?? [],
  addCategories: (names: string[]) => supabase.from('categories').upsert(names.map(name => ({ name })), { onConflict: 'workspace_id,name', ignoreDuplicates: true }),
  deleteCategory: (id: string) => supabase.from('categories').delete().eq('id', id),

  tasks: async (goalId: string): Promise<WeeklyTask[]> =>
    (await supabase.from('weekly_tasks').select('*').eq('goal_id', goalId).order('created_at')).data ?? [],
  allTasksAllGoals: async (): Promise<WeeklyTask[]> =>
    (await supabase.from('weekly_tasks').select('*').order('week_start').order('created_at')).data ?? [],
  saveTask: (t: Partial<WeeklyTask>) => supabase.from('weekly_tasks').upsert(t),
  deleteTask: (id: string) => supabase.from('weekly_tasks').delete().eq('id', id),
  allTasks: async (start: string, end: string): Promise<WeeklyTask[]> =>
    (await supabase.from('weekly_tasks').select('*').gte('week_start', start).lte('week_start', end)).data ?? [],
  saveTasks: (ts: Partial<WeeklyTask>[]) => supabase.from('weekly_tasks').insert(ts),

  topics: async (goalId: string): Promise<WeeklyTopic[]> =>
    (await supabase.from('weekly_topics').select('*').eq('goal_id', goalId).order('sort_order').order('created_at')).data ?? [],
  allTopics: async (): Promise<WeeklyTopic[]> =>
    (await supabase.from('weekly_topics').select('*').order('week_start').order('sort_order').order('created_at')).data ?? [],
  saveTopic: (t: Partial<WeeklyTopic>) => supabase.from('weekly_topics').upsert(t),
  deleteTopic: (id: string) => supabase.from('weekly_topics').delete().eq('id', id),

  goalLogs: async (start?: string, end?: string): Promise<GoalDailyLog[]> => {
    let q = supabase.from('goal_daily_logs').select('*').order('date', { ascending: false })
    if (start) q = q.gte('date', start)
    if (end) q = q.lte('date', end)
    return (await q).data ?? []
  },
  goalLogsByGoal: async (goalId: string): Promise<GoalDailyLog[]> =>
    (await supabase.from('goal_daily_logs').select('*').eq('goal_id', goalId).order('date', { ascending: false })).data ?? [],
  goalLogOn: async (uid: string, goalId: string, date: string): Promise<GoalDailyLog | null> =>
    (await supabase.from('goal_daily_logs').select('*').eq('user_id', uid).eq('goal_id', goalId).eq('date', date).maybeSingle()).data,
  saveGoalLog: (l: Partial<GoalDailyLog>) =>
    supabase.from('goal_daily_logs').upsert({ ...l, updated_at: new Date().toISOString() }, { onConflict: 'user_id,goal_id,date' }),
  deleteGoalLog: (id: string) => supabase.from('goal_daily_logs').delete().eq('id', id),

  /** Syncs goals.progress and goals.status from goal-linked LeetCode logs. */
  syncLeetCodeGoalProgress: async (goal: Goal) => {
    if (!goal.id) return
    const logs = await api.goalLogsByGoal(goal.id)
    const { completed, status } = calcLeetCodeStats(goal, logs)
    if (Number(goal.progress) !== completed || goal.status !== status) {
      await supabase.from('goals').update({ progress: completed, status }).eq('id', goal.id)
    }
  },

  /** Syncs goals.progress and goals.status from actual checklist task completion. */
  syncTransformersGoalProgress: async (goal: Goal) => {
    if (!goal.id) return
    const tasks = await api.tasks(goal.id)
    const { overallPct, status } = calcTransformersStats(tasks)
    const nextProgress = Math.round(((overallPct * Math.max(1, Number(goal.target) || 100)) / 100) * 100) / 100
    if (Number(goal.progress) !== nextProgress || goal.status !== status) {
      await supabase.from('goals').update({ progress: nextProgress, status }).eq('id', goal.id)
    }
  },
}
