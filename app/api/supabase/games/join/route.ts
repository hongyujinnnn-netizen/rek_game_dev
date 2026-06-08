import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/util/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { room_code, playerName, playerId } = body;

    if (!room_code || !playerId) {
      return NextResponse.json({ error: 'room_code and playerId required' }, { status: 400 });
    }

    const supabase = createClient(await cookies());

    const { data, error } = await supabase
      .from('games')
      .update({
        player_blue: playerName ?? null,
        player_id_blue: playerId,
        status: 'in_progress',
      })
      .eq('room_code', room_code)
      .is('player_id_blue', null)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
