import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Server-side workspace bootstrap.
 *
 * GET  ensures the signed-in user has a `profiles` row and a `user_state` row,
 *      then returns the onboarding state. Both writes are idempotent inserts
 *      that do nothing on conflict, so repeated calls are free.
 * POST persists the onboarding answers and marks onboarding complete.
 *
 * Why this exists: the client used to read and write `public.profiles` with the
 * browser session. Any missing GRANT or RLS policy then surfaced as
 * "permission denied for table profiles" on the sign-up screen, and a user whose
 * insert failed was left with an auth account and no profile row. With the
 * service-role key the row always exists, and the browser only ever talks to
 * this route.
 */

const THEMES = new Set(['dark', 'light', 'oled', 'cyberpunk']);

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function numberIn(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric * 10) / 10));
}

async function authenticatedUser(): Promise<
  { user: User } | { response: NextResponse }
> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return {
      response: NextResponse.json(
        { error: 'not_configured', message: 'Account services are not configured on this deployment.' },
        { status: 503 },
      ),
    };
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return {
      response: NextResponse.json(
        { error: 'unauthenticated', message: 'Please sign in again to finish setting up your workspace.' },
        { status: 401 },
      ),
    };
  }
  return { user: data.user };
}

export async function GET() {
  const auth = await authenticatedUser();
  if ('response' in auth) return auth.response;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      {
        error: 'service_role_missing',
        message: 'Workspace setup is unavailable on this deployment.',
      },
      { status: 503 },
    );
  }

  const { user } = auth;
  const displayName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '';

  const [profileInsert, stateInsert] = await Promise.all([
    admin
      .from('profiles')
      .upsert(
        { id: user.id, email: user.email, full_name: displayName.slice(0, 120) },
        { onConflict: 'id', ignoreDuplicates: true },
      ),
    admin
      .from('user_state')
      .upsert({ user_id: user.id, payload: {} }, { onConflict: 'user_id', ignoreDuplicates: true }),
  ]);

  const writeError = profileInsert.error ?? stateInsert.error;
  if (writeError) {
    console.error('[account] bootstrap write failed', writeError.code, writeError.message);
    return NextResponse.json(
      {
        error: 'profile_write_failed',
        message: "We couldn't finish setting up your workspace. This one is on us — retry in a moment.",
      },
      { status: 500 },
    );
  }

  const { data, error } = await admin
    .from('profiles')
    .select('onboarding_completed, onboarding')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[account] bootstrap read failed', error.code, error.message);
    return NextResponse.json(
      {
        error: 'profile_read_failed',
        message: "We couldn't finish setting up your workspace. This one is on us — retry in a moment.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      profile: {
        onboardingCompleted: data?.onboarding_completed === true,
        onboarding: data?.onboarding ?? {},
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  const auth = await authenticatedUser();
  if ('response' in auth) return auth.response;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: 'service_role_missing', message: 'Workspace setup is unavailable on this deployment.' },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_json', message: 'That request could not be read.' }, { status: 400 });
  }

  const theme = text(body.themePreference, 20);
  const onboarding = body.onboarding && typeof body.onboarding === 'object' && !Array.isArray(body.onboarding)
    ? body.onboarding
    : {};

  const { error } = await admin.from('profiles').upsert(
    {
      id: auth.user.id,
      email: auth.user.email,
      full_name: text(body.fullName, 120),
      university: text(body.university, 160),
      degree: text(body.degree, 160),
      semester: Math.round(numberIn(body.semester, 1, 8, 1)),
      daily_target_hours: numberIn(body.dailyTargetHours, 0, 24, 4),
      weekly_coding_target_hours: numberIn(body.weeklyCodingTargetHours, 0, 168, 15),
      theme_preference: THEMES.has(theme) ? theme : 'dark',
      dsa_active: body.dsaActive === true,
      onboarding_completed: true,
      onboarding,
    },
    { onConflict: 'id' },
  );

  if (error) {
    console.error('[account] onboarding save failed', error.code, error.message);
    // 23514 / 23502: a value failed a database constraint. The server clamps
    // every field already, so this means the schema and the app disagree.
    return NextResponse.json(
      {
        error: 'profile_save_failed',
        message: "We couldn't save your plan to the cloud. Your answers are on this device — retry in a moment.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
