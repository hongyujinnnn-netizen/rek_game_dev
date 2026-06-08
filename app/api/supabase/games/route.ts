import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/util/supabase/server';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const room = url.searchParams.get('room');

    const supabase = createClient(await cookies());

    if (room) {
      const { data, error } = await supabase.from('games').select('*').eq('room_code', room).maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data ?? null);
    }

    const { data, error } = await supabase.from('games').select('*');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
