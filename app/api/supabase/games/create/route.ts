import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getAuthenticatedPlayer, getSupabaseToken } from '@/lib/apiAuth';

export async function POST(request: Request) {
  try {
    // Authentication gate
    const player = await getAuthenticatedPlayer();
    if (!player) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { room_code, board_state, playerName } = body;

    // Use authenticated player's ID instead of trusting the request body
    const playerId = player.id;

    if (!room_code) {
      return NextResponse.json({ error: 'room_code required' }, { status: 400 });
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
      .insert({
        room_code,
        board_state: board_state ?? [],
        turn: 'red',
        status: 'waiting',
        player_red: playerName ?? player.name,
        player_blue: null,
        player_id_red: playerId,
        player_id_blue: null,
        called_square: null,
        move_history: [],
        winner: null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        const { data: existingData } = await supabase
          .from('games')
          .select('*')
          .eq('room_code', room_code)
          .single();
        if (existingData) return NextResponse.json(existingData);
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
