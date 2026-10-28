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

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Build & start

```bash
npm run build
npm run start
```

> Note: the `build`/`start` scripts use standalone output. `.env` only needs `DATABASE_URL` for the optional Prisma/DB examples — the app itself runs entirely client-side.

## Project structure

```
src/
  app/                 Next.js App Router entry + API routes
  components/nexus/    Glass OS shell (sidebar, topbar, status bar) and all modules
  components/ui/       shadcn/ui primitives
  lib/nexus/           Data model, Zustand store, seed data, timetable logic
```

## Data ownership

All edits live in the browser (`localStorage`). Use the Timetable → Schedule settings → **Export JSON / Import JSON / Reset** actions to back up or transfer a schedule.
