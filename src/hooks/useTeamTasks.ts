import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TeamTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string | null;
  assigned_to: string;
  team_id: string | null;
}

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string;
  role: 'head' | 'member';
  team_id: string;
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  members: TeamMember[];
  tasks: TeamTask[];
}

export const useTeamTasks = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['team-tasks-optimized', user?.id],
    queryFn: async (): Promise<Team[]> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Fetch teams with their members and tasks in an optimized way
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          description,
          team_members!inner(
            user_id,
            role,
            profiles!inner(
              id,
              full_name,
              email
            )
          )
        `);

      if (teamsError) {
        console.error('Error fetching teams:', teamsError);
        throw new Error(`Failed to fetch teams: ${teamsError.message}`);
      }

      // Fetch all tasks for all teams at once
      const teamIds = teams?.map(team => team.id) || [];
      
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .in('team_id', teamIds)
        .order('created_at', { ascending: false });

      if (tasksError) {
        console.error('Error fetching team tasks:', tasksError);
        throw new Error(`Failed to fetch team tasks: ${tasksError.message}`);
      }

      // Process and group the data
      const processedTeams: Team[] = (teams || []).map(team => {
        const members: TeamMember[] = team.team_members.map((member: any) => ({
          id: member.profiles.id,
          full_name: member.profiles.full_name,
          email: member.profiles.email,
          role: member.role,
          team_id: team.id
        }));

        const teamTasks: TeamTask[] = (tasks || [])
          .filter(task => task.team_id === team.id)
          .map(task => ({
            id: task.id,
            title: task.title,
            status: task.status || 'pending',
            priority: task.priority || 'medium',
            due_date: task.due_date,
            created_at: task.created_at,
            assigned_to: task.assigned_to || '',
            team_id: task.team_id
          }));

        return {
          id: team.id,
          name: team.name,
          description: team.description,
          members,
          tasks: teamTasks
        };
      });

      console.log(`[useTeamTasks] Successfully fetched ${processedTeams.length} teams with tasks`);
      return processedTeams;
    },
    enabled: !!user,
    staleTime: 1000 * 30, // 30 seconds
    retry: 2,
  });
};

export type { Team, TeamMember, TeamTask };