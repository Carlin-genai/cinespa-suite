// Compatibility re-export for legacy imports
// Some files may import from '@/lib/supabaseClient'.
// Our actual client lives at '@/integrations/supabase/client'.

export { supabase } from '@/integrations/supabase/client';
export { supabase as default } from '@/integrations/supabase/client';
