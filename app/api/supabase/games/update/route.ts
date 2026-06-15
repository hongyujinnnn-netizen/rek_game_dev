import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getAuthenticatedPlayer, getSupabaseToken } from '@/lib/apiAuth';

export async function PATCH(request: Request) {
  try {
    // Authentication gate
    const player = await getAuthenticatedPlayer();
    if (!player) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { room_code, updates } = body;

    if (!room_code || !updates) {
      return NextResponse.json({ error: 'room_code and updates required' }, { status: 400 });
    }

    const token = await getSupabaseToken();

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
