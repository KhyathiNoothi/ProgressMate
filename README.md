# ProgressMate – Collaborative Learning Tracker
React + Vite + TypeScript + Tailwind, Supabase (Postgres, Auth, Realtime, Storage), Recharts, Lucide.

## Structure
```
supabase/schema.sql     tables, trigger (2-member workspace), RLS, storage policies, realtime
src/lib                 supabase client, types, utils
src/services/api.ts     all DB/storage calls
src/hooks.ts            auth context + useLive (Realtime-backed loader)
src/components          ui primitives, Layout (4-link sidebar), Heatmap
src/pages               Goals, Daily, Progress, Insights (shown as "Reports & Analytics"), Auth
```




