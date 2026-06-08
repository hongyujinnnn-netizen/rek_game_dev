-- Supabase SQL for the online games table

create table if not exists public.games (
  room_code text primary key,
  board_state jsonb not null,
  turn text not null,
  status text not null,
  player_red text,
  player_blue text,
  player_id_red text,
  player_id_blue text,
  called_square jsonb,
  call_timer integer,
  move_history jsonb,
  winner text,
  updated_at timestamptz default now()
);

-- Create replication trigger for realtime (Supabase sets up replication automatically for public schema)

create index if not exists games_room_code_idx on public.games (room_code);
