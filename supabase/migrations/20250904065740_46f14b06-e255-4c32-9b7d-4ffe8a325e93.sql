-- Allow admins to view all profiles (needed for employee dropdown)
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Allow employees to be viewed by their organization members (alternative approach)
CREATE POLICY "Organization members can view profiles" 
ON public.profiles 
FOR SELECT 
USING (
  org_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid()
  ) OR auth.uid() = id
);