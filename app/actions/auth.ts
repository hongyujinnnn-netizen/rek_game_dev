'use server';

import { redirect } from 'next/navigation';
import { signInPlayer, signUpPlayer, setSessionCookies, verifyPlayerOtp } from '@/lib/leungRekAuth';

export async function loginAction(prevState: any, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  try {
    const { accessToken, session } = await signInPlayer(email, password);
    await setSessionCookies(session, accessToken);
  } catch (error: any) {
    return { error: error.message || 'Failed to login' };
  }

  redirect('/');
}

export async function registerAction(prevState: any, formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!name || !email || !password || !confirmPassword) {
    return { error: 'All fields are required.' };
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' };
  }

  try {
    const result = await signUpPlayer(email, password, name);
    if (result.requiresOtp) {
      return { requiresOtp: true, email: result.email };
    }
    await setSessionCookies(result.session!, result.accessToken!);
  } catch (error: any) {
    return { error: error.message || 'Failed to register' };
  }

  redirect('/');
}

export async function verifyOtpAction(prevState: any, formData: FormData) {
  const email = formData.get('email') as string;
  const token = formData.get('token') as string;

  if (!email || !token) {
    return { error: 'Missing required fields.' };
  }

  try {
    const { accessToken, session } = await verifyPlayerOtp(email, token);
    await setSessionCookies(session, accessToken);
  } catch (error: any) {
    return { error: error.message || 'Verification failed.' };
  }

  redirect('/');
}

export async function completeSetupAction(prevState: any, formData: FormData) {
  const name = formData.get('name') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  const next = formData.get('next') as string || '/';

  if (!name || !password || !confirmPassword) {
    return { error: 'All fields are required.' };
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' };
  }

  const { createServerClient } = await import('@supabase/ssr');
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.delete({ name, ...options });
        },
      },
    }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Not authenticated. Please log in again.' };
  }

  // Update auth user (password and metadata)
  const { error: updateError } = await supabase.auth.updateUser({
    password,
    data: {
      display_name: name,
      setup_completed: true,
    }
  });

  if (updateError) {
    return { error: updateError.message || 'Failed to update account details.' };
  }

  // Update public profile
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ display_name: name })
    .eq('id', user.id);

  if (profileError) {
    console.error('Failed to update profile:', profileError);
  }

  // Re-fetch session to get the new token and update cookies
  const { data: sessionData } = await supabase.auth.getSession();
  
  if (sessionData.session) {
    const { setSessionCookies } = await import('@/lib/leungRekAuth');
    
    // Create new player session
    const { data: profileData } = await supabase
      .from('profiles')
      .select('display_name, wins, losses, role')
      .eq('id', user.id)
      .single();

    const sessionObj = {
      id: user.id,
      email: user.email ?? null,
      name: profileData?.display_name ?? name,
      wins: profileData?.wins ?? null,
      losses: profileData?.losses ?? null,
      role: profileData?.role ?? 'player',
    };

    await setSessionCookies(sessionObj, sessionData.session.access_token);
  }

  redirect(next);
}

export async function requestPasswordResetAction(prevState: any, formData: FormData) {
  const email = formData.get('email') as string;

  if (!email) {
    return { error: 'Email is required.' };
  }

  const { createClient } = await import('@/util/supabase/server');
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Determine the correct origin URL for the redirect
  let origin = 
    process.env.NEXT_PUBLIC_SITE_URL ?? 
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ?? 
    process.env.NEXT_PUBLIC_VERCEL_URL ?? 
    process.env.VERCEL_URL ?? 
    (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://rek-game-dev.vercel.app');
    
  // Ensure the origin has the correct protocol (http for localhost, https for vercel)
  if (!origin.startsWith('http')) {
    origin = `https://${origin}`;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/update-password`,
  });

  if (error) {
    return { error: error.message || 'Failed to request password reset.' };
  }

  return { success: true };
}

export async function updatePasswordAction(prevState: any, formData: FormData) {
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!password || !confirmPassword) {
    return { error: 'All fields are required.' };
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' };
  }

  const { createClient } = await import('@/util/supabase/server');
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return { error: error.message || 'Failed to update password.' };
  }

  redirect('/portal');
}
