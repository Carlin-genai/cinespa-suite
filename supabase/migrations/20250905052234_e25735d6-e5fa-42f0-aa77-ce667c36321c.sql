-- Add team head role and update teams structure
-- First create team head role enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_role') THEN
    CREATE TYPE public.team_role AS ENUM ('head', 'member');
  END IF;
END $$;

-- Update team_members table to include role
ALTER TABLE public.team_members 
ADD COLUMN IF NOT EXISTS role team_role DEFAULT 'member';

-- Add predefined teams with proper organization structure
INSERT INTO public.teams (name, description, org_id) 
SELECT 'Accounts', 'Financial and accounting operations', o.id FROM public.organizations o
ON CONFLICT DO NOTHING;

INSERT INTO public.teams (name, description, org_id) 
SELECT 'Automation', 'Process automation and system integration', o.id FROM public.organizations o  
ON CONFLICT DO NOTHING;

INSERT INTO public.teams (name, description, org_id) 
SELECT 'Cinespa.20', 'Cinema and spa project development', o.id FROM public.organizations o
ON CONFLICT DO NOTHING;

INSERT INTO public.teams (name, description, org_id) 
SELECT 'Home Theatre', 'Home entertainment system solutions', o.id FROM public.organizations o
ON CONFLICT DO NOTHING;

-- Add voice notes and attachments to daily journal
ALTER TABLE public.daily_journal 
ADD COLUMN IF NOT EXISTS voice_note_url text,
ADD COLUMN IF NOT EXISTS voice_note_duration integer; -- in seconds

-- Add time limits to tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS estimated_hours integer,
ADD COLUMN IF NOT EXISTS actual_hours integer;

-- Add credit points system
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS admin_rating integer CHECK (admin_rating >= 1 AND admin_rating <= 10),
ADD COLUMN IF NOT EXISTS credit_points integer DEFAULT 0;

-- Add attachment support for task completion
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS completion_attachments jsonb DEFAULT '[]'::jsonb;

-- Create admin limit constraint (only 3 admins allowed)
CREATE OR REPLACE FUNCTION public.check_admin_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'admin' THEN
    IF (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin') >= 3 THEN
      RAISE EXCEPTION 'Maximum of 3 administrators allowed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for admin limit
DROP TRIGGER IF EXISTS admin_limit_trigger ON public.profiles;
CREATE TRIGGER admin_limit_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_admin_limit();

-- Update team_members policies to include team head permissions
DROP POLICY IF EXISTS "Team heads can manage their team" ON public.team_members;
CREATE POLICY "Team heads can manage their team"
ON public.team_members
FOR ALL
TO authenticated
USING (
  team_id IN (
    SELECT tm.team_id 
    FROM public.team_members tm 
    WHERE tm.user_id = auth.uid() 
    AND tm.role = 'head'
  )
  OR org_id IN (
    SELECT profiles.org_id
    FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role = ANY (ARRAY['admin'::text, 'manager'::text])
  )
)
WITH CHECK (
  team_id IN (
    SELECT tm.team_id 
    FROM public.team_members tm 
    WHERE tm.user_id = auth.uid() 
    AND tm.role = 'head'
  )
  OR org_id IN (
    SELECT profiles.org_id
    FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role = ANY (ARRAY['admin'::text, 'manager'::text])
  )
);

-- Update tasks policies to allow team heads to assign tasks
DROP POLICY IF EXISTS "Team heads can assign tasks" ON public.tasks;
CREATE POLICY "Team heads can assign tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  assigned_by = auth.uid() 
  AND (
    -- Admin/manager can assign to anyone
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = ANY (ARRAY['admin'::text, 'manager'::text])
    )
    OR 
    -- Team head can assign to their team members
    assigned_to IN (
      SELECT tm.user_id 
      FROM public.team_members tm
      WHERE tm.team_id IN (
        SELECT tm2.team_id 
        FROM public.team_members tm2 
        WHERE tm2.user_id = auth.uid() 
        AND tm2.role = 'head'
      )
    )
  )
);

-- Update notification preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_assigned boolean DEFAULT true,
  task_completed boolean DEFAULT true,
  task_overdue boolean DEFAULT true,
  daily_reminders boolean DEFAULT true,
  email_notifications boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on notification preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their notification preferences"
ON public.notification_preferences
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());