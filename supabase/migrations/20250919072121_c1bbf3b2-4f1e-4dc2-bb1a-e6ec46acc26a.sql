-- Dev: relax INSERT for tasks so authenticated users can create tasks
DROP POLICY IF EXISTS "Dev: tasks insert for authenticated" ON public.tasks;
CREATE POLICY "Dev: tasks insert for authenticated"
ON public.tasks
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');