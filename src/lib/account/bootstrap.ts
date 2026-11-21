/**
 * Client helpers for the server-side workspace bootstrap.
 *
 * The browser never writes public.profiles itself. That write is done by
 * /api/account/bootstrap with the service-role key, so a missing GRANT or a
 * mistyped RLS policy can no longer dead-end sign-up with a Postgres message.
 */
import { friendlyAccountError } from '@/lib/account/messages';

export interface WorkspaceProfile {
  onboardingCompleted: boolean;
  onboarding: unknown;
}

export type WorkspaceResult =
  | { ok: true; profile: WorkspaceProfile }
  /** `unavailable` means the deployment has no service-role key; callers may fall back. */
  | { ok: false; kind: 'unavailable' | 'error'; message: string };

interface BootstrapBody {
  profile?: { onboardingCompleted?: boolean; onboarding?: unknown };
  message?: string;
}

/** Ensures the signed-in user has a profile row, and returns its onboarding state. */
export async function ensureWorkspace(): Promise<WorkspaceResult> {
  try {
    const response = await fetch('/api/account/bootstrap', { method: 'GET', cache: 'no-store' });

    if (response.status === 503) return { ok: false, kind: 'unavailable', message: '' };
    if (response.status === 401) {
      return { ok: false, kind: 'error', message: 'Your session expired. Please sign in again.' };
    }

    const body = (await response.json().catch(() => ({}))) as BootstrapBody;

    if (!response.ok || !body.profile) {
      return { ok: false, kind: 'error', message: body.message || friendlyAccountError(body) };
    }

    return {
      ok: true,
      profile: {
        onboardingCompleted: body.profile.onboardingCompleted === true,
        onboarding: body.profile.onboarding ?? {},
      },
    };
  } catch (error) {
    return { ok: false, kind: 'error', message: friendlyAccountError(error) };
  }
}

export interface WorkspaceProfileInput {
  fullName?: string;
  university?: string;
  degree?: string;
  semester?: number;
  dailyTargetHours?: number;
  weeklyCodingTargetHours?: number;
  themePreference?: string;
  dsaActive?: boolean;
  onboarding?: unknown;
}

/** Persists the onboarding answers and marks the profile complete, server-side. */
export async function saveWorkspaceProfile(
  input: WorkspaceProfileInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const response = await fetch('/api/account/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (response.ok) return { ok: true };

    const body = (await response.json().catch(() => ({}))) as BootstrapBody;
    return { ok: false, message: body.message || friendlyAccountError(body) };
  } catch (error) {
    return { ok: false, message: friendlyAccountError(error) };
  }
}
