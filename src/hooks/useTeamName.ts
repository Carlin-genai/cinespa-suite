import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useTeamName = (teamId: string | null | undefined) => {
  return useQuery({
    queryKey: ['team-name', teamId],
    queryFn: async () => {
      if (!teamId) return null;
      
      const { data, error } = await supabase
        .from('teams')
        .select('name')
        .eq('id', teamId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching team name:', error);
        return null;
      }
      
      return data?.name || null;
    },
    enabled: !!teamId,
  });
};