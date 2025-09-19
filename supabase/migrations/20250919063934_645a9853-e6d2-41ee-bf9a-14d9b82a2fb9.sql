-- Update task insert policy to allow team heads to create tasks
DROP POLICY IF EXISTS "Tasks insert policy" ON public.tasks;

CREATE POLICY "Tasks insert policy" 
ON public.tasks 
FOR INSERT 
WITH CHECK (
  (assigned_by = auth.uid()) AND (
    -- Allow self-assignment
    (assigned_to = auth.uid()) OR 
    -- Allow admins to assign to anyone
    has_role(auth.uid(), 'admin'::app_role) OR 
    -- Allow team heads to assign tasks to their team members
    ((team_id IS NOT NULL) AND is_user_team_head(auth.uid(), team_id)) OR 
    -- Allow if users are in the same team
    users_in_same_team(auth.uid(), assigned_to)
  )
);