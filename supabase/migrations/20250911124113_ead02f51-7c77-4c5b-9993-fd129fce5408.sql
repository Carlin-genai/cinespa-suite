-- Fix infinite recursion in RLS policies by creating security definer functions
-- and updating policies to avoid self-referencing queries

-- First, let's create helper functions to avoid recursion

-- Function to get user's organization ID safely
CREATE OR REPLACE FUNCTION public.get_user_org_id(user_uuid uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.profiles WHERE id = user_uuid LIMIT 1;
$$;

-- Function to check if user is team head safely  
CREATE OR REPLACE FUNCTION public.is_user_team_head(user_uuid uuid, team_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE user_id = user_uuid 
    AND team_id = team_uuid 
    AND role = 'head'::team_role
  );
$$;

-- Function to check if user is in same team safely
CREATE OR REPLACE FUNCTION public.users_in_same_team(user1_uuid uuid, user2_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members tm1
    INNER JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
    WHERE tm1.user_id = user1_uuid AND tm2.user_id = user2_uuid
  );
$$;

-- Drop existing problematic policies on team_members
DROP POLICY IF EXISTS "Admins can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Team heads can manage their team" ON public.team_members;
DROP POLICY IF EXISTS "Users can view org team members" ON public.team_members;

-- Create new safe policies for team_members
CREATE POLICY "team_members_admin_access" ON public.team_members
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  org_id = public.get_user_org_id(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  org_id = public.get_user_org_id(auth.uid())
);

-- Drop existing problematic task policies  
DROP POLICY IF EXISTS "Role-based task assignment" ON public.tasks;
DROP POLICY IF EXISTS "Role-based task visibility" ON public.tasks;
DROP POLICY IF EXISTS "Unlimited task status updates" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their tasks" ON public.tasks;

-- Create new comprehensive and safe task policies
CREATE POLICY "tasks_select_policy" ON public.tasks
FOR SELECT TO authenticated
USING (
  -- User can see tasks they created, are assigned to, or are admin
  assigned_to = auth.uid() OR 
  assigned_by = auth.uid() OR 
  created_by = auth.uid() OR
  has_role(auth.uid(), 'admin'::app_role) OR
  -- Team heads can see tasks assigned to their team members
  (team_id IS NOT NULL AND public.is_user_team_head(auth.uid(), team_id)) OR
  -- Users in same team can see each other's tasks
  public.users_in_same_team(auth.uid(), assigned_to)
);

CREATE POLICY "tasks_insert_policy" ON public.tasks
FOR INSERT TO authenticated
WITH CHECK (
  -- Can create tasks for yourself or if you're admin or team head
  assigned_by = auth.uid() AND (
    assigned_to = auth.uid() OR
    has_role(auth.uid(), 'admin'::app_role) OR
    (team_id IS NOT NULL AND public.is_user_team_head(auth.uid(), team_id)) OR
    public.users_in_same_team(auth.uid(), assigned_to)
  )
);

CREATE POLICY "tasks_update_policy" ON public.tasks
FOR UPDATE TO authenticated
USING (
  -- Can update tasks you created, are assigned to, or admin
  assigned_to = auth.uid() OR 
  assigned_by = auth.uid() OR 
  created_by = auth.uid() OR
  has_role(auth.uid(), 'admin'::app_role) OR
  (team_id IS NOT NULL AND public.is_user_team_head(auth.uid(), team_id))
);

CREATE POLICY "tasks_delete_policy" ON public.tasks
FOR DELETE TO authenticated
USING (
  -- Can delete tasks you created or if you're admin
  assigned_by = auth.uid() OR 
  created_by = auth.uid() OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Add helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON public.tasks(assigned_by);  
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_team_id ON public.tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at_desc ON public.tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_org_id ON public.tasks(org_id);

-- Ensure realtime is enabled for tasks
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;