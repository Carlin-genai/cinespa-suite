-- Create the 4 teams with proper team head structure
INSERT INTO public.teams (name, description, org_id) VALUES 
('Accounts', 'Financial and accounting tasks', (SELECT id FROM public.organizations LIMIT 1)),
('Automation', 'Process automation and workflow tasks', (SELECT id FROM public.organizations LIMIT 1)),
('Cinespa 20', 'Cinema and spa operations', (SELECT id FROM public.organizations LIMIT 1)),
('Home Theatre', 'Home entertainment system setup and maintenance', (SELECT id FROM public.organizations LIMIT 1))
ON CONFLICT (name) DO NOTHING;

-- Update team_members table to ensure team heads can be properly managed
-- Add a policy for team heads to assign tasks to their team members
CREATE POLICY "Team heads can assign tasks to team members" 
ON public.tasks 
FOR INSERT 
WITH CHECK (
  -- Allow if user is a team head and is assigning to their team members
  (assigned_by = auth.uid()) AND 
  (
    assigned_to = auth.uid() OR 
    has_role(auth.uid(), 'admin'::app_role) OR
    (
      EXISTS (
        SELECT 1 FROM public.team_members tm1, public.team_members tm2
        WHERE tm1.user_id = auth.uid() 
          AND tm1.role = 'head'::team_role
          AND tm2.user_id = assigned_to
          AND tm1.team_id = tm2.team_id
      )
    )
  )
);

-- Update existing task policies to allow unlimited status updates
DROP POLICY IF EXISTS "Users can update their assigned tasks" ON public.tasks;

CREATE POLICY "Users can update their assigned tasks unlimited" 
ON public.tasks 
FOR UPDATE 
USING (
  (assigned_to = auth.uid()) OR 
  (assigned_by = auth.uid()) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  (
    -- Team heads can update tasks for their team members
    EXISTS (
      SELECT 1 FROM public.team_members tm1, public.team_members tm2
      WHERE tm1.user_id = auth.uid() 
        AND tm1.role = 'head'::team_role
        AND tm2.user_id = assigned_to
        AND tm1.team_id = tm2.team_id
    )
  )
);