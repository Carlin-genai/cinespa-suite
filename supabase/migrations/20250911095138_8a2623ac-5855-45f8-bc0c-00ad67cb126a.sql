-- Allow users to view other profiles in their organization
CREATE POLICY IF NOT EXISTS "Users can view org profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  org_id IS NOT NULL AND org_id IN (
    SELECT p.org_id FROM public.profiles AS p WHERE p.id = auth.uid()
  )
);
