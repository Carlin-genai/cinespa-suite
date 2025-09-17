-- Ensure RLS is enabled on teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Allow insert for authenticated users (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'teams' AND policyname = 'Allow insert for authenticated users'
  ) THEN
    CREATE POLICY "Allow insert for authenticated users"
    ON public.teams
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
  END IF;
END
$$;