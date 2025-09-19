-- Ensure tasks table has proper replica identity for realtime
ALTER TABLE public.tasks REPLICA IDENTITY FULL;

-- Temporary relaxed policy for testing realtime (dev only)
DROP POLICY IF EXISTS "Team tasks visibility" ON public.tasks;
CREATE POLICY "Dev: tasks visibility for authenticated"
ON public.tasks
FOR SELECT
USING (auth.role() = 'authenticated');