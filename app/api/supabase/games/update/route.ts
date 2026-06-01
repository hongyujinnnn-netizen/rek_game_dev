import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/util/supabase/server';

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { room_code, updates } = body;

    if (!room_code || !updates) {
      return NextResponse.json({ error: 'room_code and updates required' }, { status: 400 });
    }

    const supabase = createClient(cookies());

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
