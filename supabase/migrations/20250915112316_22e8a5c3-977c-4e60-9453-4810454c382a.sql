-- Fix organization RLS policy to allow creating organizations
-- Drop the existing restrictive policy and create a more permissive one

DROP POLICY IF EXISTS "Users can create an organization if none exists" ON public.organizations;

-- Create a more permissive policy that allows users to create organizations when needed
CREATE POLICY "Users can create organizations when needed" 
ON public.organizations 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Also allow users to update their organization
DROP POLICY IF EXISTS "Admins can manage their organization" ON public.organizations;

CREATE POLICY "Users can manage their organization" 
ON public.organizations 
FOR ALL
TO authenticated
USING (id IN (SELECT profiles.org_id FROM profiles WHERE profiles.id = auth.uid()))
WITH CHECK (id IN (SELECT profiles.org_id FROM profiles WHERE profiles.id = auth.uid()) OR NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.org_id IS NOT NULL));