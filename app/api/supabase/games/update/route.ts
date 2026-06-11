import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { room_code, updates } = body;

    if (!room_code || !updates) {
      return NextResponse.json({ error: 'room_code and updates required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('leung_rek_access_token')?.value;

    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!,
      token ? {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      } : {}
    );

    const { data, error } = await supabase
      .from('games')
      .update(updates)
      .eq('room_code', room_code)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
