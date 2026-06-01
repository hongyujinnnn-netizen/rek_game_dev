import { cookies } from 'next/headers';

const ACCESS_TOKEN_COOKIE = 'leung_rek_access_token';
const REFRESH_TOKEN_COOKIE = 'leung_rek_refresh_token';

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
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
    `${config.url}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=display_name,wins,losses&limit=1`,
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
    };
  }

  const [profile] = (await response.json()) as Array<{
    display_name?: string | null;
    wins?: number | null;
    losses?: number | null;
  }>;

  return {
    id: user.id,
    email: user.email ?? null,
    name: profile?.display_name ?? fallbackName,
    wins: profile?.wins ?? null,
    losses: profile?.losses ?? null,
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
  const payload = await supabaseRequest<SupabaseAuthResponse>('/auth/v1/signup', {
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
    throw new Error('Check your email to confirm your account before signing in.');
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    session: await readPlayerProfile(payload.access_token, payload.user),
  };
}

export async function readCurrentPlayerSession(): Promise<PlayerSession | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    return null;
  }

  const user = await supabaseRequest<SupabaseUser>('/auth/v1/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return readPlayerProfile(accessToken, user);
}

export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  };

  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, cookieOptions);
  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions);
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();

  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}
