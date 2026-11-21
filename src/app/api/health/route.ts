import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Deployment health and schema-drift check.
 *
 * It answers one question on every request: does the database this app is
 * pointed at actually look like the schema the code expects? A missing table, a
 * dropped column, or revoking a GRANT by accident shows up here instead of on a
 * user's sign-up screen.
 *
 * Checks:
 *  1. Every table and column the app reads or writes exists and is queryable.
 *  2. `public.profiles` is NOT readable with the publishable anon key, because
 *     profile rows hold personal data and are per-user only.
 *  3. The environment has the variables the account paths need.
 *
 * Returns 200 when healthy and 503 when drift or misconfiguration is found. No
 * row data and no secrets are ever included in the response.
 */

interface Finding {
  level: 'error' | 'warning';
  code: string;
  message: string;
}

const REQUIRED_TABLES: { table: string; columns: string[] }[] = [
  {
    table: 'profiles',
    columns: [
      'id', 'email', 'full_name', 'university', 'degree', 'semester',
      'daily_target_hours', 'weekly_coding_target_hours', 'theme_preference',
      'dsa_active', 'onboarding_completed', 'onboarding', 'created_at', 'updated_at',
    ],
  },
  { table: 'user_state', columns: ['user_id', 'payload', 'revision', 'updated_at'] },
  {
    table: 'study_logs',
    columns: ['id', 'user_id', 'log_date', 'day_type', 'sleep_hours', 'energy', 'notes', 'focus_minutes_by_subject', 'updated_at'],
  },
  {
    table: 'study_sessions',
    columns: ['id', 'user_id', 'session_date', 'start_time', 'end_time', 'subject_id', 'category', 'duration_minutes', 'concentration', 'energy', 'tags', 'notes'],
  },
  {
    table: 'tasks',
    columns: ['id', 'user_id', 'title', 'status', 'priority', 'area', 'due_date', 'subtasks', 'tags', 'completed_at'],
  },
  { table: 'habits', columns: ['id', 'user_id', 'name', 'target_per_week', 'archived'] },
  { table: 'habit_completions', columns: ['user_id', 'habit_id', 'completion_date', 'completed'] },
  {
    table: 'coding_roadmap',
    columns: ['id', 'user_id', 'name', 'status', 'current_level', 'target_level', 'weekly_hours_goal'],
  },
  {
    table: 'support_contributions',
    columns: ['razorpay_order_id', 'razorpay_payment_id', 'amount_paise', 'currency', 'status', 'failure_reason', 'payer_email', 'updated_at'],
  },
];

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const findings: Finding[] = [];
  const tables: Record<string, 'ok' | 'missing' | 'error' | 'skipped'> = {};
  const env = {
    supabaseUrl: Boolean(url),
    supabaseAnonKey: Boolean(anonKey),
    supabaseServiceRoleKey: Boolean(serviceKey),
  };

  if (!url || !anonKey) {
    findings.push({
      level: 'error',
      code: 'supabase_public_env_missing',
      message: 'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set for accounts to work.',
    });
  }
  if (!serviceKey) {
    findings.push({
      level: 'error',
      code: 'service_role_key_missing',
      message: 'SUPABASE_SERVICE_ROLE_KEY is required for sign-up bootstrap and the contribution ledger.',
    });
  }

  if (url && (serviceKey || anonKey)) {
    // Prefer the service role so GRANT problems under `authenticated` do not
    // mask a genuinely missing table or column.
    const probe = createClient(url, serviceKey ?? anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let reachable = true;

    for (const [index, { table, columns }] of REQUIRED_TABLES.entries()) {
      if (!reachable) {
        tables[table] = 'skipped';
        continue;
      }

      const { error } = await probe.from(table).select(columns.join(','), { head: true, count: 'exact' });

      if (!error) {
        tables[table] = 'ok';
        continue;
      }

      // A transport failure carries no SQLSTATE. Report it once and stop
      // probing: nine identical findings hide the real cause.
      const detail = [error.code, error.message].filter(Boolean).join(' ').trim();
      const transport = !error.code && /fetch failed|network|ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT/i.test(detail);
      if (!detail || transport) {
        reachable = false;
        tables[table] = 'error';
        REQUIRED_TABLES.slice(index + 1).forEach((rest) => { tables[rest.table] = 'skipped'; });
        findings.push({
          level: 'error',
          code: 'supabase_unreachable',
          message: 'Could not reach the Supabase project at NEXT_PUBLIC_SUPABASE_URL. Check the URL and that the project is running.',
        });
        break;
      }

      const missing = /PGRST205|42P01|does not exist/i.test(detail);
      const missingColumn = /42703|column .* does not exist/i.test(detail);
      tables[table] = missing ? 'missing' : 'error';

      findings.push({
        level: 'error',
        code: missing ? 'table_missing' : missingColumn ? 'column_missing' : 'table_probe_failed',
        message: missing
          ? `Table public.${table} is missing. Apply the migrations in supabase/migrations.`
          : missingColumn
            ? `Table public.${table} is missing a column the app uses: ${detail}`
            : `Could not read public.${table}: ${detail}`,
      });
    }
  } else {
    for (const { table } of REQUIRED_TABLES) tables[table] = 'skipped';
  }

  // A profile row is personal data. The publishable key must never read it.
  if (url && anonKey && serviceKey) {
    const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await anon.from('profiles').select('id').limit(1);

    if (!error && data && data.length > 0) {
      findings.push({
        level: 'error',
        code: 'profiles_publicly_readable',
        message: 'public.profiles is readable with the publishable anon key. Revoke the anon GRANT and re-check the RLS policies.',
      });
    }
  }

  const ok = findings.every((finding) => finding.level !== 'error');

  return NextResponse.json(
    {
      ok,
      checkedAt: new Date().toISOString(),
      env,
      tables,
      findings,
    },
    {
      status: ok ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
