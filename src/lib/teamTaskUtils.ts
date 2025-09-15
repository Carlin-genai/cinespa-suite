import { Task } from '@/types';

export interface GroupedTeamTask {
  id: string; // Use team_id as the unique identifier
  teamId: string;
  teamName: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date: string;
  created_at: string;
  assigned_by: string;
  memberCount: number;
  members: Array<{
    id: string;
    name: string;
    email: string;
    status: string;
    taskId: string;
  }>;
  // Use the first task's data for common properties
  notes?: string;
  attachments?: any;
  estimated_hours?: number;
  actual_hours?: number;
  admin_rating?: number;
  credit_points?: number;
}

export const groupTeamTasks = (tasks: Task[], teams: any[] = []): GroupedTeamTask[] => {
  // Filter tasks that have team_id
  const teamTasks = tasks.filter(task => task.team_id);
  
  // Group by team_id
  const groupedByTeam = teamTasks.reduce((acc, task) => {
    const teamId = task.team_id!;
    if (!acc[teamId]) {
      acc[teamId] = [];
    }
    acc[teamId].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  // Convert to GroupedTeamTask array
  return Object.entries(groupedByTeam).map(([teamId, teamTaskList]) => {
    const firstTask = teamTaskList[0];
    const team = teams.find(t => t.id === teamId);
    
    // Determine team status based on member statuses
    const statuses = teamTaskList.map(t => t.status);
    let teamStatus = 'pending';
    
    if (statuses.every(s => s === 'completed')) {
      teamStatus = 'completed';
    } else if (statuses.some(s => s === 'overdue')) {
      teamStatus = 'overdue';  
    } else if (statuses.some(s => s === 'in-progress')) {
      teamStatus = 'in-progress';
    }

    return {
      id: teamId,
      teamId,
      teamName: team?.name || `Team ${teamId.slice(0, 8)}`,
      title: firstTask.title,
      description: firstTask.description,
      status: teamStatus,
      priority: firstTask.priority,
      due_date: firstTask.due_date,
      created_at: firstTask.created_at,
      assigned_by: firstTask.assigned_by,
      memberCount: teamTaskList.length,
      members: teamTaskList.map(task => ({
        id: task.assigned_to || '',
        name: task.assigned_to || 'Unknown',
        email: '',
        status: task.status,
        taskId: task.id,
      })),
      notes: firstTask.notes,
      attachments: firstTask.attachments,
      estimated_hours: firstTask.estimated_hours,
      actual_hours: firstTask.actual_hours,
      admin_rating: firstTask.admin_rating,
      credit_points: firstTask.credit_points,
    };
  });
};

export const getIndividualTasks = (tasks: Task[]): Task[] => {
  return tasks.filter(task => !task.team_id);
};