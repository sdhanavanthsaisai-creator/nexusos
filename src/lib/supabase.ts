'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NexusData } from '@/lib/nexus/types';
import { buildSeed } from '@/lib/nexus/seed';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  client = createBrowserClient(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}

export interface CloudSnapshot {
  payload: NexusData;
  updated_at: string;
}

export function isCloudSnapshot(value: unknown): value is CloudSnapshot {
  if (!value || typeof value !== 'object') return false;
  const payload = (value as CloudSnapshot).payload as Partial<NexusData> | undefined;
  return Boolean(
    payload &&
    payload.profile &&
    Array.isArray(payload.subjects) &&
    Array.isArray(payload.tasks) &&
    Array.isArray(payload.habits) &&
    payload.settings &&
    payload.timetable,
  );
}

/** Avoid syncing user-supplied Gemini API credentials into cloud snapshots. */
export function snapshotForCloud(state: NexusData): NexusData {
  return {
    ...state,
    settings: { ...state.settings, geminiKey: '' },
  };
}

export function createEmptySnapshot(): NexusData {
  const seed = buildSeed();
  return {
    ...seed,
    dailyLogs: {},
    sessions: [],
    tasks: [],
    habits: [],
    habitRecords: {},
    projects: [],
    notes: [],
    resources: [],
    exams: [],
    timetable: { ...seed.timetable, events: [] },
    dsaActive: false,
    dsaTopics: seed.dsaTopics.map((topic) => ({ ...topic, problemsSolved: 0, mastery: 0 })),
    chat: [],
    celebrated: [],
  };
}
