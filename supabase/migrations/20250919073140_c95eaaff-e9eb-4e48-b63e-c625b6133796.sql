-- Update INSERT policy to allow admins to create any type of task
DROP POLICY IF EXISTS "Users can insert their own tasks" ON public.tasks;

CREATE POLICY "Users can insert tasks"
ON public.tasks
FOR INSERT
WITH CHECK (
  -- User must be authenticated and be the one creating the task
  created_by = auth.uid() 
  AND assigned_by = auth.uid()
  AND (
    -- Self tasks: user assigns to themselves
    (task_type = 'self' AND assigned_to = auth.uid())
    -- Team tasks: admins can assign to anyone, team heads can assign to team members
    OR (task_type = 'team' AND (
      has_role(auth.uid(), 'admin'::app_role)  -- Admins can assign to anyone
      OR (team_id IS NOT NULL AND is_user_team_head(auth.uid(), team_id))
      OR users_in_same_team(auth.uid(), assigned_to)
    ))
  )
);

-- Ensure admins can see all team tasks (including ones they create)
DROP POLICY IF EXISTS "Team tasks visibility" ON public.tasks;

CREATE POLICY "Team tasks visibility"
ON public.tasks
FOR SELECT
USING (
  task_type = 'team'
  AND (
    assigned_to = auth.uid() 
    OR assigned_by = auth.uid() 
    OR created_by = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)  -- Admins can see all team tasks
    OR (team_id IS NOT NULL AND is_user_team_head(auth.uid(), team_id))
    OR users_in_same_team(auth.uid(), assigned_to)
    OR (org_id = get_current_user_org_id())
  )
);