import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/types';

interface TeamMemberCount {
  team_id: string;
  member_count: number;
}

/**
 * Hook to calculate user's total credit points with automatic team credit distribution
 * - Individual tasks: full credit points
 * - Team tasks: credit points divided equally among team members
 */
export const useUserCreditPoints = (userId: string | undefined, tasks: Task[]) => {
  // Fetch team member counts for all team tasks
  const teamIds = useMemo(() => {
    const ids = tasks
      .filter(task => task.team_id && task.assigned_to === userId)
      .map(task => task.team_id!)
      .filter((id, index, self) => self.indexOf(id) === index); // unique
    return ids;
  }, [tasks, userId]);

  const { data: teamMemberCounts = [] } = useQuery({
    queryKey: ['team-member-counts', teamIds],
    queryFn: async () => {
      if (teamIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('team_members')
        .select('team_id')
        .in('team_id', teamIds);
      
      if (error) throw error;
      
      // Count members per team
      const counts: Record<string, number> = {};
      data.forEach(member => {
        counts[member.team_id] = (counts[member.team_id] || 0) + 1;
      });
      
      return Object.entries(counts).map(([team_id, member_count]) => ({
        team_id,
        member_count,
      }));
    },
    enabled: teamIds.length > 0,
  });

  // Calculate total credit points
  const totalCreditPoints = useMemo(() => {
    if (!userId) return 0;

    const userTasks = tasks.filter(task => task.assigned_to === userId);
    
    return userTasks.reduce((sum: number, task: Task) => {
      const taskCredit = task.credit_points || 0;
      
      // If it's a team task, divide credit by number of team members
      if (task.team_id) {
        const teamCount = teamMemberCounts.find(tc => tc.team_id === task.team_id);
        const memberCount = teamCount?.member_count || 1;
        return sum + (taskCredit / memberCount);
      }
      
      // Individual task: full credit
      return sum + taskCredit;
    }, 0);
  }, [userId, tasks, teamMemberCounts]);

  return {
    totalCreditPoints: Math.round(totalCreditPoints), // Round to nearest integer
    isLoading: teamIds.length > 0 && teamMemberCounts.length === 0,
  };
};
