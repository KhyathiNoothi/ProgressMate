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

## Setup
1. Create a project at supabase.com.
2. SQL Editor → paste and run `supabase/schema.sql` (run it once, on a fresh project).
3. Authentication → Providers → Email. For quick testing turn off "Confirm email".
4. `cp .env.example .env` and fill in Project URL + anon key (Project Settings → API).
5. `npm install && npm run dev`
6. Register user 1 and user 2 (different browsers). The first signup creates the shared workspace, the second joins it, a third is rejected.

## Test checklist
- Both users: add goals (page 1) → each sees the other's goals read-only.
- Add a daily update with a file (page 2) → appears instantly in Our Progress for the other user.
- Edit a past date via the date picker or the "recent updates" list.
- Insights: switch member/month, download the report.
- RLS check: in the SQL editor, try updating the other user's row as the other user → 0 rows affected.

## Notes
- UI primitives in `components/ui.tsx` follow shadcn/ui conventions; you can replace them with generated shadcn components (`npx shadcn@latest init`) without touching pages much.
- Progress status is derived automatically (progress ≥ target → completed).
