
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Bell, Plus, Settings } from 'lucide-react';
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

const TeamTasks = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [reminderTaskId, setReminderTaskId] = useState<string>('');
  const [reminderTaskTitle, setReminderTaskTitle] = useState<string>('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [teamCreateDialogOpen, setTeamCreateDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [teamEditDialogOpen, setTeamEditDialogOpen] = useState(false);

  // Fetch all tasks from backend (team view)
  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['team-tasks'],
    queryFn: () => apiService.getTasks(),
  });

  // Fetch teams
  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => supabaseApi.getTeams(),
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
    mutationFn: async (taskData: Partial<Task> & { assignedEmployees?: string[] }) => {
      const { assignedEmployees, ...task } = taskData;
      
      if (assignedEmployees && assignedEmployees.length > 0) {
        // Create individual tasks for each assigned employee
        const taskPromises = assignedEmployees.map(employeeId => 
          apiService.createTask({
            ...task,
            assigned_to: employeeId,
            assigned_by: user?.id,
          })
        );
        
        return Promise.all(taskPromises);
      } else {
        // Regular task creation
        return apiService.createTask({
          ...task,
          assigned_by: user?.id,
        });
      }
    },
    onSuccess: (result) => {
      const taskCount = Array.isArray(result) ? result.length : 1;
      queryClient.invalidateQueries({ queryKey: ['team-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      toast({
        title: "Success",
        description: `Team task${taskCount > 1 ? 's' : ''} created successfully (${taskCount} ${taskCount > 1 ? 'employees' : 'employee'} assigned)`,
      });
      setCreateDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create team task",
        variant: "destructive",
      });
      console.error('Create task error:', error);
    },
  });

  // Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: async (teamData: { name: string; description?: string; memberIds: string[] }) => {
      const team = await supabaseApi.createTeam({
        name: teamData.name,
        description: teamData.description,
      });
      
      // Add members to the team
      for (const memberId of teamData.memberIds) {
        await supabaseApi.addTeamMember(team.id, memberId);
      }
      
      return team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast({
        title: "Success",
        description: "Team created successfully",
      });
      setTeamCreateDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create team",
        variant: "destructive",
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

  const handleCreateTask = (taskData: Partial<Task> & { assignedEmployees?: string[] }) => {
    createTaskMutation.mutate(taskData);
  };

  const handleCreateTeam = (teamData: { name: string; description?: string; memberIds: string[] }) => {
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

  if (isLoading || teamsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <p className="text-overdue-red mb-4">Failed to load team tasks. Please check your backend connection.</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  // Group tasks by status (memoized for performance)
  const { pendingTasks, inProgressTasks, completedTasks, overdueTasks } = useMemo(() => {
    return {
      pendingTasks: tasks.filter((task: Task) => task.status === 'pending'),
      inProgressTasks: tasks.filter((task: Task) => task.status === 'in-progress'),
      completedTasks: tasks.filter((task: Task) => task.status === 'completed'),
      overdueTasks: tasks.filter((task: Task) => task.status === 'overdue'),
    };
  }, [tasks]);

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

      <Tabs defaultValue="tasks" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Tasks
          </TabsTrigger>
          {canManageTeams && (
            <TabsTrigger value="teams" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Manage Teams
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="tasks" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{tasks.length} total tasks</span>
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

          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                <Users className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold font-montserrat mb-2">No team tasks</h3>
              <p className="text-muted-foreground font-opensans mb-4">
                No tasks have been created for the team yet.
              </p>
              {canCreateTasks && (
                <Button 
                  onClick={() => setCreateDialogOpen(true)}
                  className="bg-rose-gold hover:bg-rose-gold-dark text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Team Task
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Overdue Tasks */}
              {overdueTasks.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-overdue-red mb-4 flex items-center gap-2">
                    Overdue Tasks ({overdueTasks.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {overdueTasks.map((task: Task) => (
                      <div key={task.id} className="relative group">
                        <TaskCard
                          task={task}
                          onEdit={handleEditTask}
                          onDelete={handleDeleteTask}
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

              {/* In Progress Tasks */}
              {inProgressTasks.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-progress-blue mb-4 flex items-center gap-2">
                    In Progress ({inProgressTasks.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {inProgressTasks.map((task: Task) => (
                      <div key={task.id} className="relative group">
                        <TaskCard
                          task={task}
                          onEdit={handleEditTask}
                          onDelete={handleDeleteTask}
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

              {/* Pending Tasks */}
              {pendingTasks.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                    Pending ({pendingTasks.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingTasks.map((task: Task) => (
                      <div key={task.id} className="relative group">
                        <TaskCard
                          task={task}
                          onEdit={handleEditTask}
                          onDelete={handleDeleteTask}
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

              {/* Completed Tasks */}
              {completedTasks.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-completed-green mb-4 flex items-center gap-2">
                    Completed ({completedTasks.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {completedTasks.map((task: Task) => (
                      <div key={task.id} className="relative group">
                        <TaskCard
                          task={task}
                          onEdit={handleEditTask}
                          onDelete={handleDeleteTask}
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
          <TabsContent value="teams" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Settings className="h-4 w-4" />
                <span>{teams.length} total teams</span>
              </div>
              <Button 
                onClick={() => setTeamCreateDialogOpen(true)}
                className="bg-rose-gold hover:bg-rose-gold-dark text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Team
              </Button>
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
                <Button 
                  onClick={() => setTeamCreateDialogOpen(true)}
                  className="bg-rose-gold hover:bg-rose-gold-dark text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Team
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    onEdit={handleEditTeam}
                    onDelete={handleDeleteTeam}
                  />
                ))}
              </div>
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

      <TeamCreateDialog
        open={teamCreateDialogOpen}
        onOpenChange={setTeamCreateDialogOpen}
        onSave={handleCreateTeam}
      />
    </div>
  );
};

export default TeamTasks;
