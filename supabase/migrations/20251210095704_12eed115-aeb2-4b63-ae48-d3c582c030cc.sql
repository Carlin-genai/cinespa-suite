-- Add policy to allow authenticated users to view unprocessed connect commands
-- This is needed for the connection flow where user_id is not yet set
CREATE POLICY "Authenticated users can view unprocessed connect commands" 
ON public.telegram_commands 
FOR SELECT 
USING (
  auth.role() = 'authenticated' 
  AND command = 'connect' 
  AND processed = false
);

-- Also add UPDATE policy so users can mark commands as processed during connection
CREATE POLICY "Authenticated users can update connect commands" 
ON public.telegram_commands 
FOR UPDATE 
USING (
  auth.role() = 'authenticated' 
  AND command = 'connect' 
  AND processed = false
)
WITH CHECK (
  auth.role() = 'authenticated'
);