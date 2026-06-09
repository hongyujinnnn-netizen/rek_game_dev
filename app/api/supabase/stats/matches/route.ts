import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/util/supabase/server';

export async function GET() {
  try {
    const supabase = createClient(await cookies());

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('player_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
