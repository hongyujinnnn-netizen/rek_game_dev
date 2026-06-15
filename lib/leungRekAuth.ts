import { cookies } from 'next/headers';
import { signSessionToken, verifySessionToken } from '@/lib/jwt';

const SESSION_COOKIE = 'leung_rek_session';
const SB_TOKEN_COOKIE = 'leung_rek_sb_token';

type SupabaseUser = {
  id: string;
  email?: string;
  user_metadata?: {
    display_name?: string;
    full_name?: string;
    name?: string;
  };
};

type SupabaseAuthResponse = {
  access_token?: string;
  refresh_token?: string;
  user?: SupabaseUser;
  error?: string;
  error_description?: string;
  msg?: string;
};

export type PlayerSession = {
  id: string;
  email: string | null;
  name: string;
  wins: number | null;
  losses: number | null;
  role: string;
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return {
    anonKey,
    url: url.replace(/\/$/, ''),
  };
}

export function isAuthConfigured(): boolean {
  return Boolean(getSupabaseConfig());
}

function getAuthError(payload: SupabaseAuthResponse): string {
  return payload.error_description ?? payload.msg ?? payload.error ?? 'Authentication failed.';
}

async function supabaseRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error('Supabase Auth is not configured.');
  }

  const response = await fetch(`${config.url}${path}`, {
    ...init,
    headers: {
      apikey: config.anonKey,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });
  const payload = (await response.json().catch(() => ({}))) as T & SupabaseAuthResponse;

  if (!response.ok) {
    throw new Error(getAuthError(payload));
  }

  return payload;
}

async function readPlayerProfile(accessToken: string, user: SupabaseUser): Promise<PlayerSession> {
  const config = getSupabaseConfig();
  const fallbackName =
    user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? 'Player';

  if (!config) {
    throw new Error('Supabase Auth is not configured.');
  }

  const response = await fetch(
    `${config.url}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=display_name,wins,losses,role&limit=1`,
    {
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    return {
      id: user.id,
      email: user.email ?? null,
      name: fallbackName,
      wins: null,
      losses: null,
      role: 'player',
    };
  }

  const [profile] = (await response.json()) as Array<{
    display_name?: string | null;
    wins?: number | null;
    losses?: number | null;
    role?: string | null;
  }>;

  return {
    id: user.id,
    email: user.email ?? null,
    name: profile?.display_name ?? fallbackName,
    wins: profile?.wins ?? null,
    losses: profile?.losses ?? null,
    role: profile?.role ?? 'player',
  };
}

export async function signInPlayer(email: string, password: string) {
  const payload = await supabaseRequest<SupabaseAuthResponse>('/auth/v1/token?grant_type=password', {
    body: JSON.stringify({ email, password }),
    method: 'POST',
  });

  if (!payload.access_token || !payload.refresh_token || !payload.user) {
    throw new Error('Supabase did not return a complete session.');
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    session: await readPlayerProfile(payload.access_token, payload.user),
  };
}

export async function signUpPlayer(email: string, password: string, name: string) {
  const payload = await supabaseRequest<SupabaseAuthResponse>('/auth/v1/signup?redirect_to=https://rek-game-dev.vercel.app/auth/callback', {
    body: JSON.stringify({
      email,
      password,
      data: {
        display_name: name,
      },
    }),
    method: 'POST',
  });

  if (!payload.access_token || !payload.refresh_token || !payload.user) {
    return {
      requiresOtp: true,
      email: payload.user?.email || email,
    };
  }

  return {
    requiresOtp: false,
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    session: await readPlayerProfile(payload.access_token, payload.user),
  };
}

export async function verifyPlayerOtp(email: string, token: string) {
  const payload = await supabaseRequest<SupabaseAuthResponse>('/auth/v1/verify', {
    body: JSON.stringify({
      type: 'signup',
      email,
      token,
    }),
    method: 'POST',
  });

  if (!payload.access_token || !payload.refresh_token || !payload.user) {
    throw new Error('Verification failed. Invalid or expired code.');
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    session: await readPlayerProfile(payload.access_token, payload.user),
  };
}

// ─── JWT-based Session Cookie Management ──────────────────────────────────────

/**
 * Reads the current player session from the JWT cookie.
 * No Supabase API call needed — session is verified locally.
 */
export async function readCurrentPlayerSession(): Promise<PlayerSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

/**
 * Sets both the JWT session cookie and the Supabase access token cookie.
 * The JWT contains the player session data for fast local verification.
 * The Supabase token is kept separately for database operations.
 */
export async function setSessionCookies(session: PlayerSession, supabaseAccessToken: string) {
  const cookieStore = await cookies();
  const jwt = await signSessionToken(session);

  const cookieOptions = {
    httpOnly: true,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  };

  cookieStore.set(SESSION_COOKIE, jwt, cookieOptions);
  cookieStore.set(SB_TOKEN_COOKIE, supabaseAccessToken, cookieOptions);
}

/**
 * Clears both the JWT session cookie and the Supabase token cookie.
 */
export async function clearSessionCookies() {
  const cookieStore = await cookies();

  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(SB_TOKEN_COOKIE);
}

// ─── Legacy aliases (for backward compatibility during migration) ─────────────

/** @deprecated Use setSessionCookies instead */
export const setAuthCookies = async (accessToken: string, _refreshToken: string) => {
  // During the transition, if called with just tokens (old pattern),
  // we need to fetch the session first. This shouldn't normally be called
  // in the new flow.
  const user = await supabaseRequest<SupabaseUser>('/auth/v1/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const session = await readPlayerProfile(accessToken, user);
  await setSessionCookies(session, accessToken);
};

/** @deprecated Use clearSessionCookies instead */
export const clearAuthCookies = clearSessionCookies;
