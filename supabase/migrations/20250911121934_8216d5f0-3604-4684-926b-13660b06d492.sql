-- Fix task creation and update flow with safe defaults and proper RLS (without team creation)

-- 1. Update set_task_defaults function to handle all safe defaults
CREATE OR REPLACE FUNCTION public.set_task_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set assigned_by to current user if not provided
  IF NEW.assigned_by IS NULL THEN
    NEW.assigned_by := auth.uid();
  END IF;

  -- Set assigned_to to current user if not provided
  IF NEW.assigned_to IS NULL THEN
    NEW.assigned_to := auth.uid();
  END IF;

  -- Set created_by to current user if not provided
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;

  -- Set org_id from current user's profile if not provided
  IF NEW.org_id IS NULL THEN
    NEW.org_id := public.get_current_user_org_id();
  END IF;

  -- Set status to pending if not provided
  IF NEW.status IS NULL THEN
    NEW.status := 'pending';
  END IF;

  -- Set priority to medium if not provided
  IF NEW.priority IS NULL THEN
    NEW.priority := 'medium';
  END IF;

  -- Set credit_points to 0 if not provided
  IF NEW.credit_points IS NULL THEN
    NEW.credit_points := 0;
  END IF;

  -- Set is_self_task based on assigned_to and assigned_by
  IF NEW.is_self_task IS NULL THEN
    NEW.is_self_task := (NEW.assigned_to = NEW.assigned_by);
  END IF;

  -- Set due_date to tomorrow at 5 PM if not provided
  IF NEW.due_date IS NULL THEN
    NEW.due_date := date_trunc('day', now()) + interval '1 day' + interval '17 hours';
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Update RLS policies for unlimited task status updates
DROP POLICY IF EXISTS "Users can update assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their assigned tasks unlimited" ON public.tasks;

-- New unlimited update policy for employees, admins, and team heads
CREATE POLICY "Unlimited task status updates" 
ON public.tasks 
FOR UPDATE 
USING (
  assigned_to = auth.uid() OR 
  assigned_by = auth.uid() OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  (EXISTS (
    SELECT 1 
    FROM team_members tm1, team_members tm2
    WHERE tm1.user_id = auth.uid() 
    AND tm1.role = 'head'::team_role 
    AND tm2.user_id = tasks.assigned_to 
    AND tm1.team_id = tm2.team_id
  ))
);

-- 3. Update task INSERT policies to allow team heads to assign tasks
DROP POLICY IF EXISTS "Insert tasks per role" ON public.tasks;
DROP POLICY IF EXISTS "Team heads can assign tasks to team members" ON public.tasks;

-- Comprehensive insert policy for all roles
CREATE POLICY "Role-based task assignment" 
ON public.tasks 
FOR INSERT 
WITH CHECK (
  assigned_by = auth.uid() AND (
    -- Self-assignment (anyone can assign to themselves)
    assigned_to = auth.uid() OR
    -- Admins can assign to anyone
    has_role(auth.uid(), 'admin'::app_role) OR
    -- Team heads can assign to their team members
    (EXISTS (
      SELECT 1 
      FROM team_members tm1, team_members tm2
      WHERE tm1.user_id = auth.uid() 
      AND tm1.role = 'head'::team_role 
      AND tm2.user_id = tasks.assigned_to 
      AND tm1.team_id = tm2.team_id
    ))
  )
);

-- 4. Update SELECT policy to allow proper visibility for all roles
DROP POLICY IF EXISTS "Users can view assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view their assigned tasks" ON public.tasks;

-- Comprehensive select policy
CREATE POLICY "Role-based task visibility" 
ON public.tasks 
FOR SELECT 
USING (
  -- Tasks assigned TO user
  assigned_to = auth.uid() OR
  -- Tasks assigned BY user  
  assigned_by = auth.uid() OR
  -- Admins can see all tasks
  has_role(auth.uid(), 'admin'::app_role) OR
  -- Team heads can see their team's tasks
  (EXISTS (
    SELECT 1 
    FROM team_members tm1, team_members tm2
    WHERE tm1.user_id = auth.uid() 
    AND tm1.role = 'head'::team_role 
    AND tm2.user_id = tasks.assigned_to 
    AND tm1.team_id = tm2.team_id
  ))
);