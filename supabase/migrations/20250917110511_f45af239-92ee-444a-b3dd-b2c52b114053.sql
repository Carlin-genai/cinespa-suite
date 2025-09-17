-- Fix notifications.type check constraint to allow types used by the app
DO $$ BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Recreate a permissive but controlled CHECK constraint
ALTER TABLE public.notifications
ADD CONSTRAINT notifications_type_check
CHECK (
  type IN (
    'task',          -- default/general
    'task_completed',
    'task_overdue',
    'task_due_soon',
    'task_assigned'
  )
);

-- Optional: ensure status has reasonable values as well (keep existing if present)
-- NOTE: We are not changing other constraints to avoid unintended side effects.
