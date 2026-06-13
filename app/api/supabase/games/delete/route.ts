import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { readCurrentPlayerSession } from '@/lib/leungRekAuth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { room_code } = body;

    if (!room_code) {
      return NextResponse.json({ error: 'room_code required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('leung_rek_access_token')?.value;

    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!,
      token && !process.env.SUPABASE_SERVICE_ROLE_KEY ? {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      } : {}
    );

    const { data: deletedData, error } = await supabase
      .from('games')
      .delete()
      .eq('room_code', room_code)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!deletedData || deletedData.length === 0) {
       console.warn(`Room ${room_code} not found or could not be deleted (RLS issue?)`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
