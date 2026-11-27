export type Profile = { id: string; display_name: string; workspace_id: string }
export type Milestone = { week: number; text: string; done: boolean }
export type Goal = { id?: string; user_id: string; month: string; description?: string; start_date?: string; end_date?: string; category: string; title: string; target: number; progress: number; unit: string; deadline: string | null; priority: 'low' | 'medium' | 'high'; status: 'not_started' | 'in_progress' | 'completed'; milestones: Milestone[] }
export type Update = { id?: string; user_id: string; date: string; worked_on?: string; completed?: string; learned?: string; plan_tomorrow?: string; goal_id?: string | null; is_draft?: boolean; tasks: string; leetcode_count: number; leetcode_links: string[]; topics: string[]; practical: string; hours: number; challenges: string; github_links: string[]; files: { name: string; path: string }[] }
export type Category = { id: string; name: string }
export type WeeklyTask = { id?: string; user_id: string; goal_id: string; week_start: string; title: string; link: string | null; is_done: boolean }
