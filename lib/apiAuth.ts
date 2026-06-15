import { cookies } from 'next/headers';
import { verifySessionToken, type PlayerSession } from '@/lib/jwt';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const SESSION_COOKIE = 'leung_rek_session';
const SB_TOKEN_COOKIE = 'leung_rek_sb_token';

// ─── Read Session from JWT Cookie ─────────────────────────────────────────────

/**
 * Reads the JWT session cookie and verifies it.
 * Returns the player session or null if not authenticated.
 */
export async function getAuthenticatedPlayer(): Promise<PlayerSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

// ─── Read Supabase Token ──────────────────────────────────────────────────────

/**
 * Reads the Supabase access token from the cookie.
 * This is used by API routes that need to make authenticated Supabase requests.
 */
export async function getSupabaseToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SB_TOKEN_COOKIE)?.value ?? null;
}

// ─── Create Authenticated Supabase Client ─────────────────────────────────────

/**
 * Creates a Supabase client authenticated with the user's access token.
 * Falls back to an anonymous client if no token is available.
 */
export async function createAuthenticatedSupabaseClient() {
  const token = await getSupabaseToken();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )!;

  return createSupabaseClient(supabaseUrl, supabaseKey, token ? {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  } : {});
}

// ─── Require Auth (for API routes) ────────────────────────────────────────────

/**
 * Verifies authentication and returns the player session + supabase token.
 * Returns null if the user is not authenticated.
 */
export async function requireAuth(): Promise<{
  player: PlayerSession;
  supabaseToken: string | null;
} | null> {
  const player = await getAuthenticatedPlayer();

  if (!player) {
    return null;
  }

  const supabaseToken = await getSupabaseToken();

  return { player, supabaseToken };
}
