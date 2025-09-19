-- Update team tasks visibility policy to show all team tasks in the organization
DROP POLICY IF EXISTS "Team tasks visibility" ON public.tasks;

CREATE POLICY "Team tasks visibility" 
ON public.tasks 
FOR SELECT 
USING (
  (task_type = 'team'::text) AND (
    -- Original conditions for direct involvement
    (assigned_to = auth.uid()) OR 
    (assigned_by = auth.uid()) OR 
    (created_by = auth.uid()) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    ((team_id IS NOT NULL) AND is_user_team_head(auth.uid(), team_id)) OR 
    users_in_same_team(auth.uid(), assigned_to) OR
    -- New condition: allow viewing all team tasks in the same organization
    (org_id = get_current_user_org_id())
  )
);