-- Ensure required columns exist with proper defaults
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS task_type text DEFAULT 'team';

-- Add check constraint for task_type values (drop first if exists)
ALTER TABLE public.tasks 
DROP CONSTRAINT IF EXISTS tasks_task_type_check;

ALTER TABLE public.tasks 
ADD CONSTRAINT tasks_task_type_check 
CHECK (task_type IN ('self', 'team'));

-- Ensure RLS is enabled
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Self tasks visible only to creator" ON public.tasks;
DROP POLICY IF EXISTS "Team tasks visibility" ON public.tasks;
DROP POLICY IF EXISTS "Dev: tasks visibility for authenticated" ON public.tasks;
DROP POLICY IF EXISTS "Tasks insert policy" ON public.tasks;
DROP POLICY IF EXISTS "Tasks update policy" ON public.tasks;
DROP POLICY IF EXISTS "Tasks delete policy" ON public.tasks;

-- Create new RLS policies for self-tasks (private to creator only)
CREATE POLICY "Self tasks visible only to creator"
ON public.tasks
FOR SELECT
USING (
  task_type = 'self' 
  AND created_by = auth.uid()
);

-- Create RLS policy for team tasks (visible based on existing team rules)
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
    OR (org_id = get_current_user_org_id())
  )
);

-- Insert policies
CREATE POLICY "Users can insert their own tasks"
ON public.tasks
FOR INSERT
WITH CHECK (
  created_by = auth.uid() 
  AND assigned_by = auth.uid()
  AND (
    -- Self tasks: user assigns to themselves
    (task_type = 'self' AND assigned_to = auth.uid())
    -- Team tasks: admin or team head can assign to team members
    OR (task_type = 'team' AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR (team_id IS NOT NULL AND is_user_team_head(auth.uid(), team_id))
      OR users_in_same_team(auth.uid(), assigned_to)
    ))
  )
);

-- Update policies
CREATE POLICY "Users can update their tasks"
ON public.tasks
FOR UPDATE
USING (
  -- Self tasks: only creator can update
  (task_type = 'self' AND created_by = auth.uid())
  -- Team tasks: assignee, creator, admin, or team head can update
  OR (task_type = 'team' AND (
    assigned_to = auth.uid() 
    OR assigned_by = auth.uid() 
    OR created_by = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (team_id IS NOT NULL AND is_user_team_head(auth.uid(), team_id))
  ))
);

-- Delete policies
CREATE POLICY "Users can delete their tasks"
ON public.tasks
FOR DELETE
USING (
  -- Self tasks: only creator can delete
  (task_type = 'self' AND created_by = auth.uid())
  -- Team tasks: creator, admin, or team head can delete
  OR (task_type = 'team' AND (
    assigned_by = auth.uid() 
    OR created_by = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (team_id IS NOT NULL AND is_user_team_head(auth.uid(), team_id))
  ))
);