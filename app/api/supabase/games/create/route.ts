import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/util/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { room_code, board_state, playerName, playerId } = body;

    if (!room_code || !playerId) {
      return NextResponse.json({ error: 'room_code and playerId required' }, { status: 400 });
    }

    const supabase = createClient(cookies());

    const { data, error } = await supabase
      .from('games')
      .insert({
        room_code,
        board_state: board_state ?? [],
        turn: 'red',
        status: 'waiting',
        player_red: playerName ?? null,
        player_blue: null,
        player_id_red: playerId,
        player_id_blue: null,
        called_square: null,
        move_history: [],
        winner: null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
