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

    const session = await readCurrentPlayerSession();
    if (!session || !session.id) {
      return NextResponse.json({ message: 'Guest stats not recorded' }, { status: 200 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('leung_rek_access_token')?.value;

    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    const userId = session.id;

    // Fetch the game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('room_code', room_code)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status !== 'finished') {
      return NextResponse.json({ error: 'Game is not finished' }, { status: 400 });
    }

    // Determine if the caller is a player in this game
    const isRed = game.player_id_red === userId;
    const isBlue = game.player_id_blue === userId;

    if (!isRed && !isBlue) {
      return NextResponse.json({ error: 'User is not a player in this game' }, { status: 403 });
    }

    // UPSERT the single match record first
    const { data: matchRecord, error: upsertError } = await supabase
      .from('matches')
      .upsert({
        room_code: game.room_code,
        player_red_id: game.player_id_red,
        player_blue_id: game.player_id_blue,
        player_red_name: game.player_red,
        player_blue_name: game.player_blue,
        winner: game.winner || 'draw',
      }, { onConflict: 'room_code' })
      .select()
      .single();

    if (upsertError || !matchRecord) {
      return NextResponse.json({ error: 'Failed to record match' }, { status: 500 });
    }

    // Determine results
    const redWon = game.winner === 'red';
    const blueWon = game.winner === 'blue';
    const drawn = game.winner !== 'red' && game.winner !== 'blue';

    // Helper to safely update profile stats
    const updateProfileStats = async (playerId: string | null, won: boolean, isDraw: boolean) => {
      if (!playerId || playerId.startsWith('guest-') || playerId.startsWith('user:')) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('wins, losses')
        .eq('id', playerId)
        .single();
        
      if (profile) {
        let { wins, losses } = profile;
        if (!isDraw) {
          if (won) wins = (wins || 0) + 1;
          else losses = (losses || 0) + 1;
        }

        await supabase
          .from('profiles')
          .update({ wins, losses })
          .eq('id', playerId);
      }
    };

    // Credit stats for the calling player if not already credited
    if (isRed && !matchRecord.red_stats_recorded) {
      await updateProfileStats(userId, redWon, drawn);
      await supabase.from('matches').update({ red_stats_recorded: true }).eq('room_code', room_code);
    } else if (isBlue && !matchRecord.blue_stats_recorded) {
      await updateProfileStats(userId, blueWon, drawn);
      await supabase.from('matches').update({ blue_stats_recorded: true }).eq('room_code', room_code);
    } else {
      return NextResponse.json({ message: 'Stats already credited for this user' }, { status: 200 });
    }

    const result = isRed ? (redWon ? 'win' : drawn ? 'draw' : 'loss') : (blueWon ? 'win' : drawn ? 'draw' : 'loss');

    return NextResponse.json({ success: true, result });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
