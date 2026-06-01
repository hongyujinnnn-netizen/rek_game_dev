import { NextResponse } from 'next/server';
import { isAuthConfigured, setAuthCookies, signUpPlayer } from '@/lib/leungRekAuth';

export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json({ error: 'Supabase Auth is not configured.' }, { status: 503 });
  }

  const { email, name, password } = (await request.json()) as {
    email?: string;
    name?: string;
    password?: string;
  };

  if (!email || !password || !name) {
    return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
  }

  try {
    const { accessToken, refreshToken, session } = await signUpPlayer(email, password, name);

    await setAuthCookies(accessToken, refreshToken);

    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to create account.' },
      { status: 400 }
    );
  }
}
