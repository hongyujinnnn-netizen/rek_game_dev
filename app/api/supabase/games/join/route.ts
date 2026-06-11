import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { room_code, playerName, playerId } = body;

    if (!room_code || !playerId) {
      return NextResponse.json({ error: 'room_code and playerId required' }, { status: 400 });
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
      .update({
        player_blue: playerName ?? null,
        player_id_blue: playerId,
        status: 'in_progress',
      })
      .eq('room_code', room_code)
      .is('player_id_blue', null)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows updated. The room is either full, doesn't exist, or we already joined.
        const { data: existingData } = await supabase
          .from('games')
          .select('*')
          .eq('room_code', room_code)
          .single();
          
        if (existingData) {
          if (existingData.player_id_blue === playerId || existingData.player_id_red === playerId) {
            return NextResponse.json(existingData);
          }
          return NextResponse.json({ error: 'Room is already full' }, { status: 403 });
        }
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
