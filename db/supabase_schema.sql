-- Supabase Schema for Rek Game

-- Create a table for public profiles
create table profiles (
  id uuid references auth.users not null primary key,
  display_name text not null,
  wins integer default 0 not null,
  losses integer default 0 not null,
  role text default 'player' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- This trigger automatically creates a profile entry when a new user signs up via Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email), coalesce(new.raw_user_meta_data->>'role', 'player'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create a table for recent matches (Redesigned)
drop table if exists public.matches;

create table matches (
  id uuid default uuid_generate_v4() primary key,
  room_code text unique not null,
  player_red_id text,
  player_blue_id text,
  player_red_name text,
  player_blue_name text,
  winner text check (winner in ('red', 'blue', 'draw')),
  red_stats_recorded boolean default false,
  blue_stats_recorded boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table matches enable row level security;

create policy "Matches are viewable by everyone."
  on matches for select
  using ( true );

create policy "Users can insert matches."
  on matches for insert
  with check ( auth.uid()::text = player_red_id OR auth.uid()::text = player_blue_id );

create policy "Users can update matches."
  on matches for update
  using ( auth.uid()::text = player_red_id OR auth.uid()::text = player_blue_id );
