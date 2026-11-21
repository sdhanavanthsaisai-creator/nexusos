/**
 * User-facing copy for account and workspace failures.
 *
 * Supabase errors are written for developers ("permission denied for table
 * profiles", SQLSTATE 42501), and echoing them on the sign-up screen tells a
 * student nothing except that the product is broken. Every account path now
 * routes its failures through here: the raw detail goes to the console for us,
 * and the person sees one calm sentence with a next step.
 */

export class AccountError extends Error {
  /** Copy safe to render on screen. */
  readonly userMessage: string;

  /**
   * @param userMessage copy safe to render on screen
   * @param detail       raw error, logged for debugging only
   */
  constructor(userMessage: string, detail?: unknown) {
    super(userMessage);
    this.name = 'AccountError';
    this.userMessage = userMessage;
    if (detail !== undefined) console.warn('[account]', detail);
  }
}

interface ErrorLike {
  code?: unknown;
  message?: unknown;
}

function describe(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const { code, message } = error as ErrorLike;
    return [code, message].filter(Boolean).map(String).join(' ');
  }
  return '';
}

/** Maps any account/workspace failure to one sentence a student can act on. */
export function friendlyAccountError(error: unknown): string {
  const raw = describe(error);
  if (raw) console.warn('[account]', raw);

  // Missing GRANTs or a blocked RLS policy.
  if (/permission denied|42501/i.test(raw)) {
    return "We couldn't finish setting up your workspace. This one is on us — retry in a moment.";
  }
  // A table or column the app expects is absent: migrations not applied.
  if (/does not exist|schema cache|42P01|PGRST205|42703/i.test(raw)) {
    return "Your workspace is still being prepared on our side. Please retry shortly.";
  }
  // Expired or invalid session.
  if (/jwt|token|session|401/i.test(raw)) {
    return 'Your session expired. Please sign in again.';
  }
  // Constraint violation from a malformed or outdated payload.
  if (/violates|23514|23502|22P02/i.test(raw)) {
    return "Some of those answers weren't accepted. Please check them and try again.";
  }
  if (/fetch|network|offline|timeout|failed to load/i.test(raw)) {
    return 'Check your connection and try again. Your answers stay on this device.';
  }
  return 'Something went wrong while saving your workspace. Your answers are kept on this device — try again.';
}
