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

      // 1) Fetch teams (basic fields)
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, description');

      if (teamsError) {
        console.error('Error fetching teams:', teamsError);
        throw new Error(`Failed to fetch teams: ${teamsError.message}`);
      }

      const teamIds = (teamsData || []).map((t) => t.id);
      if (teamIds.length === 0) return [];

      // 2) Fetch team members for those teams
      const { data: teamMembersData, error: membersError } = await supabase
        .from('team_members')
        .select('team_id, user_id, role')
        .in('team_id', teamIds);

      if (membersError) {
        console.error('Error fetching team members:', membersError);
        throw new Error(`Failed to fetch team members: ${membersError.message}`);
      }

      const userIds = Array.from(new Set((teamMembersData || []).map((m) => m.user_id))).filter(Boolean) as string[];

      // 3) Fetch profiles for those user ids
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
      }

      // 4) Fetch tasks for these teams
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title, status, priority, due_date, created_at, assigned_to, team_id')
        .in('team_id', teamIds)
        .order('created_at', { ascending: false });

      if (tasksError) {
        console.error('Error fetching team tasks:', tasksError);
        throw new Error(`Failed to fetch team tasks: ${tasksError.message}`);
      }

      // 5) Build Team structures
      const profileMap = new Map((profilesData || []).map((p) => [p.id, p]));

      const teamMembersByTeam = new Map<string, TeamMember[]>();
      (teamMembersData || []).forEach((m) => {
        const profile = profileMap.get(m.user_id);
        if (!profile) return;
        const member: TeamMember = {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          role: (m.role as 'head' | 'member') || 'member',
          team_id: m.team_id,
        };
        const list = teamMembersByTeam.get(m.team_id) || [];
        list.push(member);
        teamMembersByTeam.set(m.team_id, list);
      });

      const tasksByTeam = new Map<string, TeamTask[]>();
      (tasksData || []).forEach((t) => {
        const list = tasksByTeam.get(t.team_id || '') || [];
        list.push({
          id: t.id,
          title: t.title,
          status: t.status || 'pending',
          priority: t.priority || 'medium',
          due_date: t.due_date,
          created_at: t.created_at,
          assigned_to: t.assigned_to || '',
          team_id: t.team_id,
        });
        tasksByTeam.set(t.team_id || '', list);
      });

      const processedTeams: Team[] = (teamsData || []).map((team) => ({
        id: team.id,
        name: team.name,
        description: team.description,
        members: teamMembersByTeam.get(team.id) || [],
        tasks: tasksByTeam.get(team.id) || [],
      }));

      console.log(`[useTeamTasks] Fetched ${processedTeams.length} teams, ${tasksData?.length || 0} tasks, ${teamMembersData?.length || 0} members`);
      return processedTeams;
    },
    enabled: !!user,
    staleTime: 1000 * 30, // 30 seconds
    retry: 2,
  });
};

export type { Team, TeamMember, TeamTask };