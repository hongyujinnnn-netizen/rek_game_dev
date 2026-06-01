import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/leungRekAuth';

export async function POST() {
  await clearAuthCookies();

  return NextResponse.json({ ok: true });
}
