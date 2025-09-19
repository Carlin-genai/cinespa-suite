-- Ensure tasks table supports realtime events properly
ALTER TABLE public.tasks REPLICA IDENTITY FULL;

-- Add tasks to realtime publication if not already added
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;

-- Temporary relaxed policy for testing realtime (dev only)
DROP POLICY IF EXISTS "Team tasks visibility" ON public.tasks;
CREATE POLICY "Dev: tasks visibility for authenticated"
ON public.tasks
FOR SELECT
USING (auth.role() = 'authenticated');