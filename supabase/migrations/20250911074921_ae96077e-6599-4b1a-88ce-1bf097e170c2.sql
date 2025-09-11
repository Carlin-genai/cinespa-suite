-- Fix task creation by making INSERT policies permissive and coherent
-- Drop existing restrictive INSERT policies
DROP POLICY IF EXISTS "Team heads can assign tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert tasks they assign" ON public.tasks;

-- Ensure RLS is enabled (no-op if already enabled)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Recreate INSERT policies as PERMISSIVE (default) so any one matching condition allows insert

-- 1) Admins/Managers and Team Heads can assign tasks
CREATE POLICY "Team heads can assign tasks" ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  (assigned_by = auth.uid()) AND (
    (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = ANY (ARRAY['admin','manager'])
      )
    )
    OR (
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
  )
);

-- 2) Users can create self tasks or any they assign, constrained by assigned_by = self
CREATE POLICY "Users can insert tasks" ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (assigned_by = auth.uid());

-- 3) Users can insert tasks they assign if admin or team head or assigning to self
CREATE POLICY "Users can insert tasks they assign" ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  (assigned_by = auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.is_team_head(auth.uid())
    OR (assigned_to = auth.uid())
  )
);
