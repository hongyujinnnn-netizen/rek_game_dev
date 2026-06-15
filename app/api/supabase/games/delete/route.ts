import { NextResponse } from 'next/server';
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
    const { room_code } = body;

    if (!room_code) {
      return NextResponse.json({ error: 'room_code required' }, { status: 400 });
    }

    const token = await getSupabaseToken();

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

    // Authorization: verify the user is a player in this game before deleting
    const { data: game } = await supabase
      .from('games')
      .select('player_id_red, player_id_blue')
      .eq('room_code', room_code)
      .single();

    if (game && game.player_id_red !== player.id && game.player_id_blue !== player.id) {
      return NextResponse.json({ error: 'You are not a player in this game' }, { status: 403 });
    }

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
