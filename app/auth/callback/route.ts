import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { setSessionCookies } from '@/lib/leungRekAuth';
import type { PlayerSession } from '@/lib/jwt';
import { createClient } from '@/util/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  // if "next" is in param, use it as the redirect URL
  const next = requestUrl.searchParams.get('next') ?? '/';

  let origin = 
    process.env.NEXT_PUBLIC_SITE_URL ?? 
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ?? 
    process.env.NEXT_PUBLIC_VERCEL_URL ?? 
    process.env.VERCEL_URL ?? 
    (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://rek-game-dev.vercel.app');
    
  if (!origin.startsWith('http')) {
    origin = `https://${origin}`;
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
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
      
      // Check if setup is completed
      if (!meta.setup_completed) {
        return NextResponse.redirect(`${origin}/portal/setup?next=${encodeURIComponent(next)}`);
      }
      
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/portal?error=Could not authenticate user`);
}
