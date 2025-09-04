-- Drop the previous policies that might be conflicting
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Organization members can view profiles" ON public.profiles;

-- Update the existing "Users can view their own profile" policy to allow admins to see all
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create a comprehensive policy that allows users to see their own profile AND allows admins to see all profiles
CREATE POLICY "Users can view profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = id OR 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);