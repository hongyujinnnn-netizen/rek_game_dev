import { NextResponse } from 'next/server';
import { isAuthConfigured, setSessionCookies, signInPlayer } from '@/lib/leungRekAuth';

export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json({ error: 'Supabase Auth is not configured.' }, { status: 503 });
  }

  const { email, password } = (await request.json()) as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  try {
    const { accessToken, session } = await signInPlayer(email, password);

    await setSessionCookies(session, accessToken);

    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to sign in.' },
      { status: 401 }
    );
  }
}
