import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { setSessionCookies } from '@/lib/leungRekAuth';
import type { PlayerSession } from '@/lib/jwt';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.session) {
      // Build player session from Supabase user data
      const user = data.session.user;
      const meta = user.user_metadata ?? {};

      // Try to fetch profile from database for accurate wins/losses/role
      let wins: number | null = null;
      let losses: number | null = null;
      let role = 'player';
      let displayName = meta.display_name ?? meta.full_name ?? meta.name ?? user.email ?? 'Player';

      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('display_name, wins, losses, role')
          .eq('id', user.id)
          .single();

        if (profileData) {
          displayName = profileData.display_name ?? displayName;
          wins = profileData.wins ?? null;
          losses = profileData.losses ?? null;
          role = profileData.role ?? 'player';
        }
      } catch {
        // Profile fetch failed, use defaults
      }

      const session: PlayerSession = {
        id: user.id,
        email: user.email ?? null,
        name: displayName,
        wins,
        losses,
        role,
      };

      await setSessionCookies(session, data.session.access_token);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/portal?error=Could not authenticate user`);
}
