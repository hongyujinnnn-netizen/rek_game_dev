import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/util/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { room_code } = body;

    if (!room_code) {
      return NextResponse.json({ error: 'room_code required' }, { status: 400 });
    }

    const supabase = createClient(await cookies());

    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

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

    // Determine result
    let result: 'win' | 'loss' | 'draw' = 'draw';
    if (game.winner === 'red') {
      result = isRed ? 'win' : 'loss';
    } else if (game.winner === 'blue') {
      result = isBlue ? 'win' : 'loss';
    } else {
      return NextResponse.json({ error: 'No winner declared' }, { status: 400 });
    }

    const opponentName = isRed ? (game.player_blue ?? 'Guest') : (game.player_red ?? 'Guest');

    // Prevent duplicate recording by checking matches in the last 2 minutes for this opponent and result
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: recentMatches, error: matchesError } = await supabase
      .from('matches')
      .select('id')
      .eq('player_id', userId)
      .eq('opponent_name', opponentName)
      .eq('result', result)
      .gte('created_at', twoMinutesAgo)
      .limit(1);

    if (recentMatches && recentMatches.length > 0) {
      return NextResponse.json({ message: 'Stats already recorded recently' }, { status: 200 });
    }

    // Insert match record
    const { error: insertError } = await supabase
      .from('matches')
      .insert({
        player_id: userId,
        opponent_name: opponentName,
        result: result
      });

    if (insertError) {
      return NextResponse.json({ error: 'Failed to insert match' }, { status: 500 });
    }

    // Update profile stats (Since RLS allows updating own profile)
    const { data: profile, error: profileFetchError } = await supabase
      .from('profiles')
      .select('wins, losses')
      .eq('id', userId)
      .single();

    if (profile) {
      const currentWins = profile.wins ?? 0;
      const currentLosses = profile.losses ?? 0;

      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          wins: result === 'win' ? currentWins + 1 : currentWins,
          losses: result === 'loss' ? currentLosses + 1 : currentLosses
        })
        .eq('id', userId);

      if (profileUpdateError) {
        console.error('Failed to update profile stats', profileUpdateError);
      }
    }

    return NextResponse.json({ success: true, result });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
