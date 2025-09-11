-- Create security definer function to get current user org_id
CREATE OR REPLACE FUNCTION public.get_current_user_org_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Allow users to view other profiles in their organization
CREATE POLICY "Users can view org profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  org_id IS NOT NULL AND org_id = public.get_current_user_org_id()
);