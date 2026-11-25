export type Profile = { id: string; display_name: string; workspace_id: string }
export type Milestone = { week: number; text: string; done: boolean }
export type Goal = { id?: string; user_id: string; month: string; category: string; title: string; target: number; progress: number; unit: string; deadline: string | null; priority: 'low' | 'medium' | 'high'; status: 'not_started' | 'in_progress' | 'completed'; milestones: Milestone[] }
export type Update = { id?: string; user_id: string; date: string; tasks: string; leetcode_count: number; leetcode_links: string[]; topics: string[]; practical: string; hours: number; challenges: string; github_links: string[]; files: { name: string; path: string }[] }
