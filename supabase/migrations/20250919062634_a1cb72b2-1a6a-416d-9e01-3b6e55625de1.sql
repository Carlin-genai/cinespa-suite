-- Add assignedEmployees column to tasks table to store team member assignments
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assignedEmployees jsonb DEFAULT '[]'::jsonb;

-- Create index for better performance when querying assignedEmployees
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_employees ON public.tasks USING GIN(assignedEmployees);

-- Update existing team tasks to populate assignedEmployees field with assigned_to user
UPDATE public.tasks 
SET assignedEmployees = CASE 
  WHEN team_id IS NOT NULL AND (assignedEmployees IS NULL OR assignedEmployees = '[]'::jsonb)
  THEN jsonb_build_array(assigned_to::text)
  ELSE assignedEmployees
END
WHERE team_id IS NOT NULL;