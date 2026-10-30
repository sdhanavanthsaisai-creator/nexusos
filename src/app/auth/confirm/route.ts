import type { EmailOtpType } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const rawType = searchParams.get('type');
  const next = searchParams.get('next');
  const destination = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
  const origin = request.nextUrl.origin;

  if (!tokenHash || (rawType !== 'email' && rawType !== 'recovery')) {
    return NextResponse.redirect(new URL('/?auth_error=verification', origin));
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.redirect(new URL('/?auth_error=config', origin));

  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: rawType as EmailOtpType });
  if (error) return NextResponse.redirect(new URL('/?auth_error=verification', origin));

  const redirect = rawType === 'recovery'
    ? new URL('/?flow=recovery', origin)
    : new URL(destination, origin);
  return NextResponse.redirect(redirect);
}
