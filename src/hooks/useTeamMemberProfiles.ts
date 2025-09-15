import { useQuery } from '@tanstack/react-query';
import { supabaseApi } from '@/lib/supabaseApi';

export const useTeamMemberProfiles = (memberIds: string[]) => {
  return useQuery({
    queryKey: ['team-member-profiles', memberIds],
    queryFn: async () => {
      if (memberIds.length === 0) return [];
      
      const profiles = await Promise.all(
        memberIds.map(id => supabaseApi.getUserProfile(id))
      );
      
      return profiles.filter(Boolean);
    },
    enabled: memberIds.length > 0,
  });
};