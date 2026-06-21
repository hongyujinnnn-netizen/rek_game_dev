-- Function to handle game completion
create or replace function public.handle_game_finished()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  red_won boolean;
  blue_won boolean;
  is_draw boolean;
begin
  -- Only process if status changed to 'finished'
  if new.status = 'finished' and old.status != 'finished' then
    
    -- Determine outcome
    red_won := new.winner = 'red';
    blue_won := new.winner = 'blue';
    is_draw := new.winner not in ('red', 'blue');

    -- 1. Insert into matches table
    insert into public.matches (
      room_code,
      player_red_id,
      player_blue_id,
      player_red_name,
      player_blue_name,
      winner,
      red_stats_recorded,
      blue_stats_recorded
    ) values (
      new.room_code,
      new.player_id_red,
      new.player_id_blue,
      new.player_red,
      new.player_blue,
      coalesce(new.winner, 'draw'),
      true, -- Marking as recorded since this trigger handles it
      true
    )
    on conflict (room_code) do update set
      winner = excluded.winner,
      red_stats_recorded = true,
      blue_stats_recorded = true;

    -- 2. Update Red Player Stats (skip guests)
    if new.player_id_red is not null and new.player_id_red not like 'guest-%' and new.player_id_red not like 'user:%' then
      if red_won then
        update public.profiles set wins = wins + 1 where id = cast(new.player_id_red as uuid);
      elsif blue_won then
        update public.profiles set losses = losses + 1 where id = cast(new.player_id_red as uuid);
      end if;
    end if;

    -- 3. Update Blue Player Stats (skip guests)
    if new.player_id_blue is not null and new.player_id_blue not like 'guest-%' and new.player_id_blue not like 'user:%' then
      if blue_won then
        update public.profiles set wins = wins + 1 where id = cast(new.player_id_blue as uuid);
      elsif red_won then
        update public.profiles set losses = losses + 1 where id = cast(new.player_id_blue as uuid);
      end if;
    end if;

  end if;

  return new;
end;
$$;

-- Drop existing trigger if it exists
drop trigger if exists on_game_finished on public.games;

-- Create the trigger
create trigger on_game_finished
  after update on public.games
  for each row execute procedure public.handle_game_finished();
