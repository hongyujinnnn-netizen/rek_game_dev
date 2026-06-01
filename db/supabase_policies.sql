-- Row Level Security policies for public.games
-- WARNING: these policies are permissive for testing. Harden before production.

-- Ensure RLS is enabled
ALTER TABLE IF EXISTS public.games ENABLE ROW LEVEL SECURITY;

-- Allow anonymous (public) role to SELECT
CREATE POLICY IF NOT EXISTS anon_select ON public.games
  FOR SELECT
  USING (true);

-- Allow anonymous role to INSERT
CREATE POLICY IF NOT EXISTS anon_insert ON public.games
  FOR INSERT
  WITH CHECK (true);

-- Allow anonymous role to UPDATE
CREATE POLICY IF NOT EXISTS anon_update ON public.games
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS games_room_code_idx ON public.games (room_code);

-- Note: For production, scope policies to checks such as
-- auth.role() = 'anon' and/or more specific checks on room ownership.
