import { NextResponse } from 'next/server';
import { isAuthConfigured, readCurrentPlayerSession, clearSessionCookies } from '@/lib/leungRekAuth';

export async function GET() {
  if (!isAuthConfigured()) {
    return NextResponse.json({ configured: false, session: null });
  }

  try {
    return NextResponse.json({
      configured: true,
      session: await readCurrentPlayerSession(),
    });
  } catch (error) {
    // Clear cookies so an expired JWT doesn't linger and crash other API routes
    await clearSessionCookies();
    
    return NextResponse.json(
      {
        configured: true,
        error: error instanceof Error ? error.message : 'Unable to read session.',
        session: null,
      },
      { status: 401 }
    );
  }
}
