-- Add team_head to app_role enum (if not exists)
DO $$ BEGIN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'team_head';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create teams table with the 4 required teams
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on teams table
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Everyone can view teams" ON public.teams;

-- Create policy for teams visibility
CREATE POLICY "Everyone can view teams" ON public.teams FOR SELECT USING (true);

-- Insert the 4 required teams (using UPSERT approach)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Accounts') THEN
        INSERT INTO public.teams (name, description) VALUES ('Accounts', 'Financial and accounting operations');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Automation') THEN
        INSERT INTO public.teams (name, description) VALUES ('Automation', 'Process automation and technical solutions');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Cinespa.20') THEN
        INSERT INTO public.teams (name, description) VALUES ('Cinespa.20', 'Cinema and spa experience team');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Home Theatre') THEN
        INSERT INTO public.teams (name, description) VALUES ('Home Theatre', 'Home entertainment systems team');
    END IF;
END $$;

-- Add columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_team_head BOOLEAN DEFAULT false;

-- Add columns to daily_journal table
ALTER TABLE public.daily_journal ADD COLUMN IF NOT EXISTS voice_note_url TEXT;
ALTER TABLE public.daily_journal ADD COLUMN IF NOT EXISTS voice_note_duration INTEGER;

-- Add columns to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS time_limit INTEGER; -- in minutes
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('High', 'Medium', 'Low')) DEFAULT 'Medium';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS credit_points INTEGER DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- Create function to limit admin users to 3
CREATE OR REPLACE FUNCTION public.check_admin_limit_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.role != 'admin' THEN
        RETURN NEW;
    END IF;
    
    IF (SELECT COUNT(*) FROM public.user_roles WHERE role = 'admin') >= 3 THEN
        RAISE EXCEPTION 'Maximum of 3 admin users allowed';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for admin limit
DROP TRIGGER IF EXISTS check_admin_limit_trigger_v2 ON public.user_roles;
CREATE TRIGGER check_admin_limit_trigger_v2
    BEFORE INSERT ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.check_admin_limit_v2();

-- Create function to check if user is team head
CREATE OR REPLACE FUNCTION public.is_team_head(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE((SELECT is_team_head FROM public.profiles WHERE profiles.user_id = is_team_head.user_id), false);
$$;

-- Update RLS policies for tasks to handle team head access
DROP POLICY IF EXISTS "Users can view their assigned tasks" ON public.tasks;
CREATE POLICY "Users can view their assigned tasks" ON public.tasks FOR SELECT USING (
    assigned_to = auth.uid() OR 
    assigned_by = auth.uid() OR
    public.has_role(auth.uid(), 'admin') OR
    (public.is_team_head(auth.uid()) AND assigned_to IN (
        SELECT user_id FROM public.profiles 
        WHERE team_id = (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
    ))
);

DROP POLICY IF EXISTS "Users can insert tasks they assign" ON public.tasks;
CREATE POLICY "Users can insert tasks they assign" ON public.tasks FOR INSERT WITH CHECK (
    assigned_by = auth.uid() AND (
        public.has_role(auth.uid(), 'admin') OR
        public.is_team_head(auth.uid()) OR
        assigned_to = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can update their assigned tasks" ON public.tasks;
CREATE POLICY "Users can update their assigned tasks" ON public.tasks FOR UPDATE USING (
    assigned_to = auth.uid() OR 
    assigned_by = auth.uid() OR
    public.has_role(auth.uid(), 'admin') OR
    (public.is_team_head(auth.uid()) AND assigned_to IN (
        SELECT user_id FROM public.profiles 
        WHERE team_id = (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
    ))
);

-- Create function to create task completion notification
CREATE OR REPLACE FUNCTION public.create_task_completion_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' then
        INSERT INTO public.notifications (user_id, title, message, type, task_id)
        VALUES (
            NEW.assigned_by,
            'Task Completed',
            'Task "' || NEW.title || '" has been completed',
            'task_completed',
            NEW.id
        );
        
        -- Set completed_at timestamp
        NEW.completed_at = now();
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for task completion notifications
DROP TRIGGER IF EXISTS task_completion_notification_trigger ON public.tasks;
CREATE TRIGGER task_completion_notification_trigger
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.create_task_completion_notification();