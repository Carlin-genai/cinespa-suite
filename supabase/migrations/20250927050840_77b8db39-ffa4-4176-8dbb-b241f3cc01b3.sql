-- Ensure proper multi-tenant isolation with comprehensive RLS policies
-- Update user_roles table to include org_id for complete tenant isolation
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS org_id uuid;

-- Update reminders table to include org_id for complete tenant isolation  
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS org_id uuid;

-- Update existing user_roles to have org_id from their profile
UPDATE public.user_roles 
SET org_id = p.org_id 
FROM public.profiles p 
WHERE user_roles.user_id = p.id 
AND user_roles.org_id IS NULL;

-- Update existing reminders to have org_id from their user's profile
UPDATE public.reminders 
SET org_id = p.org_id 
FROM public.profiles p 
WHERE reminders.user_id = p.id 
AND reminders.org_id IS NULL;

-- Drop existing policies and create comprehensive tenant-scoped policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Role updates restricted" ON public.user_roles;
DROP POLICY IF EXISTS "Users can manage their reminders" ON public.reminders;

-- User roles policies with org scoping
CREATE POLICY "Users can view roles in their org" ON public.user_roles
FOR SELECT USING (
  org_id IS NOT NULL AND 
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can insert roles in their org" ON public.user_roles
FOR INSERT WITH CHECK (
  user_id = auth.uid() AND
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Admins can update roles in their org" ON public.user_roles
FOR UPDATE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()) AND
  (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
);

-- Reminders policies with org scoping
CREATE POLICY "Users can view reminders in their org" ON public.reminders
FOR SELECT USING (
  org_id IS NOT NULL AND 
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()) AND
  user_id = auth.uid()
);

CREATE POLICY "Users can manage reminders in their org" ON public.reminders
FOR ALL USING (
  user_id = auth.uid() AND
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
) WITH CHECK (
  user_id = auth.uid() AND
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- Update notification preferences to include org_id and proper scoping
ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS org_id uuid;

UPDATE public.notification_preferences 
SET org_id = p.org_id 
FROM public.profiles p 
WHERE notification_preferences.user_id = p.id 
AND notification_preferences.org_id IS NULL;

DROP POLICY IF EXISTS "Users can manage their notification preferences" ON public.notification_preferences;

CREATE POLICY "Users can manage notification preferences in their org" ON public.notification_preferences
FOR ALL USING (
  user_id = auth.uid() AND
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
) WITH CHECK (
  user_id = auth.uid() AND
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- Create function to automatically set org_id on user-related inserts
CREATE OR REPLACE FUNCTION public.set_user_org_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the user's org_id from their profile
  SELECT org_id INTO NEW.org_id 
  FROM public.profiles 
  WHERE id = NEW.user_id;
  
  -- If no org_id found and it's a new user, allow NULL (will be set during signup)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers to automatically set org_id
DROP TRIGGER IF EXISTS set_user_roles_org_id ON public.user_roles;
CREATE TRIGGER set_user_roles_org_id
  BEFORE INSERT ON public.user_roles
  FOR EACH ROW
  WHEN (NEW.org_id IS NULL)
  EXECUTE FUNCTION public.set_user_org_id();

DROP TRIGGER IF EXISTS set_reminders_org_id ON public.reminders;
CREATE TRIGGER set_reminders_org_id
  BEFORE INSERT ON public.reminders
  FOR EACH ROW
  WHEN (NEW.org_id IS NULL)
  EXECUTE FUNCTION public.set_user_org_id();

DROP TRIGGER IF EXISTS set_notification_preferences_org_id ON public.notification_preferences;
CREATE TRIGGER set_notification_preferences_org_id
  BEFORE INSERT ON public.notification_preferences
  FOR EACH ROW
  WHEN (NEW.org_id IS NULL)
  EXECUTE FUNCTION public.set_user_org_id();