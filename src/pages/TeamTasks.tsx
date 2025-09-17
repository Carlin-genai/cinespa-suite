
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Bell, Plus, Settings, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TaskCard from '@/components/Tasks/TaskCard';
import TaskEditDialog from '@/components/Tasks/TaskEditDialog';
import ReminderDialog from '@/components/Tasks/ReminderDialog';
import TaskCreateDialog from '@/components/Tasks/TaskCreateDialog';
import TeamCreateDialog from '@/components/Teams/TeamCreateDialog';
import TeamCard from '@/components/Teams/TeamCard';
import { apiService } from '@/lib/api';
import { supabaseApi } from '@/lib/supabaseApi';
import { useAuth } from '@/contexts/AuthContext';
import { Task } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useTasks } from '@/hooks/useTasks';
import { groupTeamTasks, getIndividualTasks, GroupedTeamTask } from '@/lib/teamTaskUtils';
import { TaskGridSkeleton, TeamGridSkeleton } from '@/components/ui/task-skeleton';
import { useTeamsRealTimeSync } from '@/hooks/useRealTimeSync';

const TeamTasks = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Real-time sync for teams
  useTeamsRealTimeSync();
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [reminderTaskId, setReminderTaskId] = useState<string>('');
  const [reminderTaskTitle, setReminderTaskTitle] = useState<string>('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [teamCreateDialogOpen, setTeamCreateDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [teamEditDialogOpen, setTeamEditDialogOpen] = useState(false);

  // Use the new useTasks hook for team tasks
  const { data: tasks = [], loading, error, reload } = useTasks('team');

  // Fetch teams with optimized caching
  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => supabaseApi.getTeams(),
    staleTime: 1000 * 60 * 5, // 5 minutes for teams
    gcTime: 1000 * 60 * 15, // Keep in cache for 15 minutes
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, task }: { id: string; task: Partial<Task> }) => 
      apiService.updateTask(id, task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
      console.error('Update task error:', error);
    },
  });

  // Delete task mutation (only for tasks assigned by current user)
  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
      console.error('Delete task error:', error);
    },
  });

  // Create reminder mutation
  const createReminderMutation = useMutation({
    mutationFn: (reminder: { task_id?: string; message: string; reminder_time: string }) => 
      apiService.createReminder(reminder),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Reminder set successfully",
      });
      setReminderDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to set reminder",
        variant: "destructive",
      });
      console.error('Create reminder error:', error);
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: Partial<Task> & { assignedEmployees?: string[]; attachments?: File[]; team_id?: string }) => {
      const { assignedEmployees, attachments, team_id, ...task } = taskData;
      const defaultDue = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      if (team_id) {
        // Create a single team task
        return apiService.createTask({
          status: task.status || 'pending',
          priority: task.priority || 'medium',
          due_date: task.due_date || defaultDue,
          ...task,
          team_id,
          assigned_to: assignedEmployees?.[0] || user?.id,
          assigned_by: user?.id,
          attachments,
        });
      } else if (assignedEmployees && assignedEmployees.length > 0) {
        // Create individual tasks for each assigned employee
        const taskPromises = assignedEmployees.map(employeeId => 
          apiService.createTask({
            status: task.status || 'pending',
            priority: task.priority || 'medium',
            due_date: task.due_date || defaultDue,
            ...task,
            assigned_to: employeeId,
            assigned_by: user?.id,
            attachments,
          })
        );
        
        return Promise.all(taskPromises);
      } else {
        // Regular task creation
        return apiService.createTask({
          status: task.status || 'pending',
          priority: task.priority || 'medium',
          due_date: task.due_date || defaultDue,
          ...task,
          assigned_by: user?.id,
          attachments,
        });
      }
    },
    onSuccess: (result) => {
      const isTeamTask = !!result && !Array.isArray(result) && (result as any).team_id;
      const taskCount = Array.isArray(result) ? result.length : 1;
      const taskType = isTeamTask ? 'team' : taskCount > 1 ? 'individual' : 'individual';
      
      queryClient.invalidateQueries({ queryKey: ['team-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      toast({
        title: "Success",
        description: isTeamTask 
          ? "Team task created successfully" 
          : `${taskType} task${taskCount > 1 ? 's' : ''} created successfully${taskCount > 1 ? ` (${taskCount} employees assigned)` : ''}`,
      });
      setCreateDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
      console.error('Create task error:', error);
    },
  });

  // Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: async (teamData: { name: string; description?: string; memberIds: string[]; teamHeadId?: string }) => {
      // Let the API handle members + head in one go (reduces RLS edge cases)
      const team = await supabaseApi.createTeam({
        name: teamData.name,
        description: teamData.description,
        memberIds: teamData.memberIds,
        teamHeadId: teamData.teamHeadId,
      });
      return team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast({
        title: 'Success',
        description: 'Team created successfully',
      });
      setTeamCreateDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to create team',
        variant: 'destructive',
      });
      console.error('Create team error:', error);
    },
  });

  // Delete team mutation
  const deleteTeamMutation = useMutation({
    mutationFn: (teamId: string) => supabaseApi.deleteTeam(teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast({
        title: "Success",
        description: "Team deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete team",
        variant: "destructive",
      });
      console.error('Delete team error:', error);
    },
  });

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setEditDialogOpen(true);
  };

  const handleSaveTask = (task: Task) => {
    updateTaskMutation.mutate({ id: task.id, task });
  };

  const handleDeleteTask = (taskId: string) => {
    // Only allow deletion if user created the task
    const task = tasks.find((t: Task) => t.id === taskId);
    if (task?.assigned_by === user?.id) {
      deleteTaskMutation.mutate(taskId);
    } else {
      toast({
        title: "Access Denied",
        description: "You can only delete tasks you created",
        variant: "destructive",
      });
    }
  };

  const handleResetTask = (taskId: string) => {
    updateTaskMutation.mutate({ 
      id: taskId, 
      task: { status: 'pending' }
    });
  };

  const handleRestartTask = (taskId: string) => {
    updateTaskMutation.mutate({ 
      id: taskId, 
      task: { status: 'in-progress' }
    });
  };

  const handleSetReminder = (taskId: string, taskTitle: string) => {
    setReminderTaskId(taskId);
    setReminderTaskTitle(taskTitle);
    setReminderDialogOpen(true);
  };

  const handleSaveReminder = (reminder: { message: string; reminder_time: string }) => {
    createReminderMutation.mutate({
      task_id: reminderTaskId,
      ...reminder
    });
  };

  const handleCreateTask = (taskData: Partial<Task> & { assignedEmployees?: string[]; team_id?: string }) => {
    createTaskMutation.mutate(taskData);
  };

  const handleCreateTeam = (teamData: { name: string; description?: string; memberIds: string[]; teamHeadId?: string }) => {
    createTeamMutation.mutate(teamData);
  };

  const handleEditTeam = (team: any) => {
    setSelectedTeam(team);
    setTeamEditDialogOpen(true);
  };

  const handleDeleteTeam = (teamId: string) => {
    deleteTeamMutation.mutate(teamId);
  };

  // Check if user is admin 
  const canCreateTasks = userRole?.role === 'admin';
  const canManageTeams = ['admin', 'manager'].includes(userRole?.role || '');

  // Skeleton loading state
  const showSkeletonLoading = loading || teamsLoading;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <p className="text-destructive mb-4">Failed to load team tasks</p>
        <p className="text-muted-foreground mb-4 text-sm">{error.message}</p>
        <Button onClick={reload} variant="outline">Retry</Button>
      </div>
    );
  }

  // Separate individual and team tasks
  const individualTasks = getIndividualTasks(tasks);
  const groupedTeamTasks = groupTeamTasks(tasks, teams);

  // Group tasks by status for both individual and team
  const groupTasksByStatus = (tasksList: Task[]) => ({
    pending: tasksList.filter((task: Task) => task.status === 'pending'),
    inProgress: tasksList.filter((task: Task) => task.status === 'in-progress'),
    completed: tasksList.filter((task: Task) => task.status === 'completed'),
    overdue: tasksList.filter((task: Task) => task.status === 'overdue'),
  });

  const groupTeamTasksByStatus = (tasksList: GroupedTeamTask[]) => ({
    pending: tasksList.filter((task: GroupedTeamTask) => task.status === 'pending'),
    inProgress: tasksList.filter((task: GroupedTeamTask) => task.status === 'in-progress'),
    completed: tasksList.filter((task: GroupedTeamTask) => task.status === 'completed'),
    overdue: tasksList.filter((task: GroupedTeamTask) => task.status === 'overdue'),
  });

  const individualTaskGroups = groupTasksByStatus(individualTasks);
  const teamTaskGroups = groupTeamTasksByStatus(groupedTeamTasks);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-montserrat text-foreground">Team Management</h1>
          <p className="text-muted-foreground font-opensans">
            Manage teams and assign tasks to team members
          </p>
        </div>
      </div>

      <Tabs defaultValue="individual" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="individual" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Individual ({individualTasks.length})
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team ({groupedTeamTasks.length})
          </TabsTrigger>
          {canManageTeams && (
            <TabsTrigger value="manage" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Manage Teams
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="individual" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{individualTasks.length} individual tasks</span>
            </div>
            {canCreateTasks && (
              <Button 
                onClick={() => setCreateDialogOpen(true)}
                className="bg-rose-gold hover:bg-rose-gold-dark text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Individual Task
              </Button>
            )}
          </div>

          {individualTasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                <User className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold font-montserrat mb-2">No individual tasks</h3>
              <p className="text-muted-foreground font-opensans mb-4">
                No individual tasks have been created yet.
              </p>
            </div>
           ) : showSkeletonLoading ? (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-semibold mb-4">Loading Individual Tasks...</h2>
                <TaskGridSkeleton count={6} />
              </div>
            </div>
           ) : (
            <div className="space-y-8">
              {individualTaskGroups.overdue.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-overdue-red mb-4 flex items-center gap-2">
                    Overdue Tasks ({individualTaskGroups.overdue.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {individualTaskGroups.overdue.map((task: Task) => (
                      <div key={task.id} className="relative group">
                        <TaskCard
                          task={task}
                          onEdit={handleEditTask}
                          onDelete={handleDeleteTask}
                          isTeamTask={false}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute top-2 right-16 opacity-0 group-hover:opacity-100 transition-opacity border-rose-gold text-rose-gold hover:bg-rose-gold hover:text-white"
                          onClick={() => handleSetReminder(task.id, task.title)}
                        >
                          <Bell className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {individualTaskGroups.inProgress.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-progress-blue mb-4 flex items-center gap-2">
                    In Progress ({individualTaskGroups.inProgress.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {individualTaskGroups.inProgress.map((task: Task) => (
                      <div key={task.id} className="relative group">
                        <TaskCard
                          task={task}
                          onEdit={handleEditTask}
                          onDelete={handleDeleteTask}
                          isTeamTask={false}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute top-2 right-16 opacity-0 group-hover:opacity-100 transition-opacity border-rose-gold text-rose-gold hover:text-white"
                          onClick={() => handleSetReminder(task.id, task.title)}
                        >
                          <Bell className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {individualTaskGroups.pending.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                    Pending ({individualTaskGroups.pending.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {individualTaskGroups.pending.map((task: Task) => (
                      <div key={task.id} className="relative group">
                        <TaskCard
                          task={task}
                          onEdit={handleEditTask}
                          onDelete={handleDeleteTask}
                          isTeamTask={false}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute top-2 right-16 opacity-0 group-hover:opacity-100 transition-opacity border-rose-gold text-rose-gold hover:bg-rose-gold hover:text-white"
                          onClick={() => handleSetReminder(task.id, task.title)}
                        >
                          <Bell className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {individualTaskGroups.completed.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-completed-green mb-4 flex items-center gap-2">
                    Completed ({individualTaskGroups.completed.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {individualTaskGroups.completed.map((task: Task) => (
                      <div key={task.id} className="relative group">
                        <TaskCard
                          task={task}
                          onEdit={handleEditTask}
                          onDelete={handleDeleteTask}
                          isTeamTask={false}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute top-2 right-16 opacity-0 group-hover:opacity-100 transition-opacity border-rose-gold text-rose-gold hover:bg-rose-gold hover:text-white"
                          onClick={() => handleSetReminder(task.id, task.title)}
                        >
                          <Bell className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{groupedTeamTasks.length} team tasks</span>
            </div>
            {canCreateTasks && (
              <Button 
                onClick={() => setCreateDialogOpen(true)}
                className="bg-rose-gold hover:bg-rose-gold-dark text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Team Task
              </Button>
            )}
          </div>

          {groupedTeamTasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                <Users className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold font-montserrat mb-2">No team tasks</h3>
              <p className="text-muted-foreground font-opensans mb-4">
                No team tasks have been created yet.
              </p>
            </div>
          ) : showSkeletonLoading ? (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-semibold mb-4">Loading Team Tasks...</h2>
                <TaskGridSkeleton count={6} />
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {teamTaskGroups.overdue.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-overdue-red mb-4 flex items-center gap-2">
                    Overdue Tasks ({teamTaskGroups.overdue.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {teamTaskGroups.overdue.map((task: GroupedTeamTask) => (
                      <div key={task.id} className="relative group">
                        <TaskCard
                          task={task}
                          onEdit={handleEditTask}
                          onDelete={handleDeleteTask}
                          isTeamTask={true}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute top-2 right-16 opacity-0 group-hover:opacity-100 transition-opacity border-rose-gold text-rose-gold hover:bg-rose-gold hover:text-white"
                          onClick={() => handleSetReminder(task.id, task.title)}
                        >
                          <Bell className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {teamTaskGroups.inProgress.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-progress-blue mb-4 flex items-center gap-2">
                    In Progress ({teamTaskGroups.inProgress.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {teamTaskGroups.inProgress.map((task: GroupedTeamTask) => (
                      <div key={task.id} className="relative group">
                        <TaskCard
                          task={task}
                          onEdit={handleEditTask}
                          onDelete={handleDeleteTask}
                          isTeamTask={true}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute top-2 right-16 opacity-0 group-hover:opacity-100 transition-opacity border-rose-gold text-rose-gold hover:bg-rose-gold hover:text-white"
                          onClick={() => handleSetReminder(task.id, task.title)}
                        >
                          <Bell className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {teamTaskGroups.pending.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                    Pending ({teamTaskGroups.pending.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {teamTaskGroups.pending.map((task: GroupedTeamTask) => (
                      <div key={task.id} className="relative group">
                        <TaskCard
                          task={task}
                          onEdit={handleEditTask}
                          onDelete={handleDeleteTask}
                          isTeamTask={true}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute top-2 right-16 opacity-0 group-hover:opacity-100 transition-opacity border-rose-gold text-rose-gold hover:bg-rose-gold hover:text-white"
                          onClick={() => handleSetReminder(task.id, task.title)}
                        >
                          <Bell className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {teamTaskGroups.completed.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-completed-green mb-4 flex items-center gap-2">
                    Completed ({teamTaskGroups.completed.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {teamTaskGroups.completed.map((task: GroupedTeamTask) => (
                      <div key={task.id} className="relative group">
                        <TaskCard
                          task={task}
                          onEdit={handleEditTask}
                          onDelete={handleDeleteTask}
                          isTeamTask={true}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute top-2 right-16 opacity-0 group-hover:opacity-100 transition-opacity border-rose-gold text-rose-gold hover:bg-rose-gold hover:text-white"
                          onClick={() => handleSetReminder(task.id, task.title)}
                        >
                          <Bell className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {canManageTeams && (
          <TabsContent value="manage" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Settings className="h-4 w-4" />
                <span>{teams.length} total teams</span>
              </div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.1 }}
              >
                <Button 
                  onClick={() => setTeamCreateDialogOpen(true)}
                  className="bg-rose-gold hover:bg-rose-gold-dark text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Team
                </Button>
              </motion.div>
            </div>

            {teams.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Settings className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold font-montserrat mb-2">No teams</h3>
                <p className="text-muted-foreground font-opensans mb-4">
                  Create your first team to organize and assign tasks.
                </p>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.1 }}
                >
                  <Button 
                    onClick={() => setTeamCreateDialogOpen(true)}
                    className="bg-rose-gold hover:bg-rose-gold-dark text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Team
                  </Button>
                </motion.div>
              </div>
            ) : showSkeletonLoading ? (
              <div>
                <h2 className="text-xl font-semibold mb-4">Loading Teams...</h2>
                <TeamGridSkeleton count={4} />
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, staggerChildren: 0.1 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {teams.map((team, index) => (
                  <motion.div
                    key={team.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    whileHover={{ y: -5 }}
                  >
                    <TeamCard
                      team={team}
                      onEdit={handleEditTeam}
                      onDelete={handleDeleteTeam}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </TabsContent>
        )}
      </Tabs>

      <TaskEditDialog
        task={selectedTask}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        onReset={handleResetTask}
        onRestart={handleRestartTask}
      />

      <ReminderDialog
        open={reminderDialogOpen}
        onOpenChange={setReminderDialogOpen}
        onSave={handleSaveReminder}
        taskId={reminderTaskId}
        taskTitle={reminderTaskTitle}
      />

      <TaskCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSave={handleCreateTask}
        isPersonalTask={false}
        showEmployeeSelection={true}
      />

      <AnimatePresence>
        {teamCreateDialogOpen && (
          <TeamCreateDialog
            open={teamCreateDialogOpen}
            onOpenChange={setTeamCreateDialogOpen}
            onSave={handleCreateTeam}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeamTasks;
