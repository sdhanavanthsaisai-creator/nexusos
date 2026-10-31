# NexusOS — Student Productivity OS

A fully local-first study dashboard: 12 modules (Dashboard, Daily Tracker, Sessions, Tasks, Habits, Calendar, **Timetable**, Roadmap, DSA Plan, Notes, Analytics, Reports, Settings) rendered in a monochrome "Glass OS" shell with a 3D hero and an AI study coach.

Built with Next.js 16 (App Router), React 19, Zustand 5 (persisted to `localStorage`), Tailwind CSS 4, shadcn/ui, ECharts, Recharts, ECharts, and Three.js.

## Highlights

- **Interactive Timetable module** — a weekly class grid that is fully state-driven and end-user editable:
  - Click any empty grid slot to add a class there; click a class to edit title, start/end time, day, status, category, color, room and notes; cancel or delete entries.
  - Structural customization via **Schedule settings**: change day start/end times, slot granularity (15/30/45/60 min), add/remove custom days and categories, choose default colors.
  - Form validation blocks logical errors: missing title, end time before start time, and overlapping slots are rejected with inline errors.
  - Instant re-renders from the Zustand store — no page reloads, layout never breaks.
  - **JSON export / import** plus **Reset to default schedule** for backup and transfer.
  - Everything persists to `localStorage` (key `nexusos-data-v1`); seed data is provided for first-time setup.

## Accounts and privacy

NexusOS is a public, multi-user app: the live site opens on a sign-in screen, and every visitor gets their own private workspace. A short setup questionnaire (name, university, degree, semester, study targets, tracked habits and coding goals) builds the initial workspace, so no shared demo data is ever shown. Answers and workspace edits are stored per account in Supabase and protected by row-level security, so one account can never read another's data.

There is no shared or seeded account. Sign up with any email to start.

## Getting started

1. Create a Supabase project, then paste [`supabase/schema.sql`](supabase/schema.sql) into the SQL Editor and run it. It creates the tables, signup trigger, and per-user row-level security policies.
2. Copy `.env.example` to `.env.local` and fill in both values from Supabase → Project Settings → API.
3. Install and run:

```bash
npm install
npm run dev
```

Open http://localhost:3000. In Supabase → Authentication → URL Configuration, add your local and deployed URLs so sign-in links return to the right place.

## Build & start

```bash
npm run build
npm run start
```

> Note: the `build`/`start` scripts use standalone output. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are required; the app shows a setup notice instead of the sign-in screen when they are missing. `DATABASE_URL` is only for the optional Prisma examples.

## Project structure

```
src/
  app/                 Next.js App Router entry + API routes
  components/nexus/    Glass OS shell (sidebar, topbar, status bar) and all modules
  components/ui/       shadcn/ui primitives
  lib/nexus/           Data model, Zustand store, seed data, timetable logic
```

## Data ownership

Edits are cached in the browser (`localStorage`) and synced to the signed-in account's row in `public.user_state`, with a revision counter so a newer cloud snapshot wins over a stale local one. Use the Timetable → Schedule settings → **Export JSON / Import JSON / Reset** actions to back up or transfer a schedule, and Settings → account actions to sign out.
