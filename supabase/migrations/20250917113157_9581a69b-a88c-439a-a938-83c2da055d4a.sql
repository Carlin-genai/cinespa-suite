-- Add task_type column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'team';

-- Add check constraint for task_type values
ALTER TABLE public.tasks 
ADD CONSTRAINT tasks_task_type_check 
CHECK (task_type IN ('self', 'team'));

-- Drop existing RLS policies to replace with new ones
DROP POLICY IF EXISTS "tasks_select_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON public.tasks;

-- Create new RLS policies for self and team tasks

-- Self-tasks: Only visible to creator
CREATE POLICY "Self tasks visible only to creator"
ON public.tasks
FOR SELECT
USING (
  task_type = 'self' 
  AND created_by = auth.uid()
);

-- Team tasks: Follow existing visibility rules (assigned users, admins, team members)
CREATE POLICY "Team tasks visibility"
ON public.tasks
FOR SELECT
USING (
  task_type = 'team'
  AND (
    assigned_to = auth.uid() 
    OR assigned_by = auth.uid() 
    OR created_by = auth.uid() 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (team_id IS NOT NULL AND is_user_team_head(auth.uid(), team_id))
    OR users_in_same_team(auth.uid(), assigned_to)
  )
);

-- Insert policy: Users can create tasks they are assigned to or admin/team permissions
CREATE POLICY "Tasks insert policy"
ON public.tasks
FOR INSERT
WITH CHECK (
  assigned_by = auth.uid() 
  AND (
    assigned_to = auth.uid() 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (team_id IS NOT NULL AND is_user_team_head(auth.uid(), team_id))
    OR users_in_same_team(auth.uid(), assigned_to)
  )
);

-- Update policy: Users can update their own tasks or admin/team permissions
CREATE POLICY "Tasks update policy"
ON public.tasks
FOR UPDATE
USING (
  assigned_to = auth.uid() 
  OR assigned_by = auth.uid() 
  OR created_by = auth.uid() 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (team_id IS NOT NULL AND is_user_team_head(auth.uid(), team_id))
);

-- Delete policy: Users can delete tasks they created/assigned or admin permissions
CREATE POLICY "Tasks delete policy"
ON public.tasks
FOR DELETE
USING (
  assigned_by = auth.uid() 
  OR created_by = auth.uid() 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Update existing self-tasks to have task_type = 'self' where is_self_task = true
UPDATE public.tasks 
SET task_type = 'self' 
WHERE is_self_task = true;