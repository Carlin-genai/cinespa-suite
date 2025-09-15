import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, User, Bell, Settings, AlertCircle, RefreshCw } from 'lucide-react';
import TaskCard from '@/components/Tasks/TaskCard';
import TaskEditDialog from '@/components/Tasks/TaskEditDialog';
import ReminderDialog from '@/components/Tasks/ReminderDialog';
import AdminRatingDialog from '@/components/Tasks/AdminRatingDialog';
import StatusFilter, { StatusFilterType } from '@/components/Tasks/StatusFilter';
import TeamTaskDetailPanel from '@/components/Tasks/TeamTaskDetailPanel';
import { apiService } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Task } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useTasks } from '@/hooks/useTasks';
import { useUserProfile } from '@/hooks/useUserProfile';

const AssignedTasks = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [reminderTaskId, setReminderTaskId] = useState<string>('');
  const [reminderTaskTitle, setReminderTaskTitle] = useState<string>('');
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedTaskForRating, setSelectedTaskForRating] = useState<string>('');
  const [individualFilter, setIndividualFilter] = useState<StatusFilterType>('all');
  const [teamFilter, setTeamFilter] = useState<StatusFilterType>('all');
  const [teamTaskDetailOpen, setTeamTaskDetailOpen] = useState(false);
  const [selectedTeamTask, setSelectedTeamTask] = useState<Task | null>(null);

  // Use the new useTasks hook for tasks assigned by current admin
  const { data: tasks = [], loading, error, reload } = useTasks('assigned');

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, task }: { id: string; task: Partial<Task> }) => 
      apiService.updateTask(id, task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['team-tasks'] });
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

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['team-tasks'] });
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

  // Rate task mutation
  const rateTaskMutation = useMutation({
    mutationFn: ({ taskId, rating, comment }: { taskId: string; rating: number; comment: string }) => 
      apiService.updateTask(taskId, { admin_rating: rating, admin_comment: comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
      toast({
        title: "Success",
        description: "Task rated successfully",
      });
      setRatingDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to rate task",
        variant: "destructive",
      });
      console.error('Rate task error:', error);
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
    // Admins can delete any task they assigned
    const task = tasks.find((t: Task) => t.id === taskId);
    if (task?.assigned_by === user?.id) {
      deleteTaskMutation.mutate(taskId);
    } else {
      toast({
        title: "Access Denied",
        description: "You can only delete tasks you assigned",
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

  const handleSetRating = (taskId: string, rating: number, comment: string) => {
    if (rating === 0) {
      // Open rating dialog
      setSelectedTaskForRating(taskId);
      setRatingDialogOpen(true);
    } else {
      rateTaskMutation.mutate({ taskId, rating, comment });
    }
  };

  const handleSaveRating = (rating: number, comment: string) => {
    rateTaskMutation.mutate({ taskId: selectedTaskForRating, rating, comment });
  };

  // Check if user is admin
  if (userRole?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
          <Settings className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold font-montserrat mb-2">Access Denied</h3>
        <p className="text-muted-foreground font-opensans">
          This page is only accessible to administrators.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-destructive mb-4">Failed to load assigned tasks</p>
        <p className="text-muted-foreground mb-4 text-sm">{error.message}</p>
        <Button onClick={reload} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  // Filter and process tasks
  const processedTasks = useMemo(() => {
    const assignedTasks = tasks.filter((task: Task) => task.assigned_by === user?.id);
    
    // Separate individual and team tasks
    const individualTasks = assignedTasks.filter((task: Task) => !task.team_id);
    const teamTasks = assignedTasks.filter((task: Task) => task.team_id);

    // Apply status filters
    const filterTasksByStatus = (tasksList: Task[], filter: StatusFilterType) => {
      if (filter === 'all') return tasksList;
      return tasksList.filter((task: Task) => task.status === filter);
    };

    const filteredIndividualTasks = filterTasksByStatus(individualTasks, individualFilter);
    const filteredTeamTasks = filterTasksByStatus(teamTasks, teamFilter);

    // Group tasks by status for counts
    const getStatusCounts = (tasksList: Task[]) => ({
      pending: tasksList.filter((task: Task) => task.status === 'pending').length,
      'in-progress': tasksList.filter((task: Task) => task.status === 'in-progress').length,
      completed: tasksList.filter((task: Task) => task.status === 'completed').length,
      overdue: tasksList.filter((task: Task) => task.status === 'overdue').length,
    });

    return {
      individualTasks: filteredIndividualTasks,
      teamTasks: filteredTeamTasks,
      individualCounts: getStatusCounts(individualTasks),
      teamCounts: getStatusCounts(teamTasks),
      allIndividualTasks: individualTasks,
      allTeamTasks: teamTasks
    };
  }, [tasks, user?.id, individualFilter, teamFilter]);

  const handleTeamTaskClick = (task: Task) => {
    setSelectedTeamTask(task);
    setTeamTaskDetailOpen(true);
  };

  const renderIndividualTaskCard = (task: Task) => (
    <div key={task.id} className="relative group">
      <TaskCard
        task={task}
        onEdit={handleEditTask}
        onDelete={handleDeleteTask}
        showAdminFeatures={true}
        onSetRating={handleSetRating}
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
  );

  const TeamTaskCard: React.FC<{ task: Task }> = ({ task }) => {
    const { data: assigneeProfile } = useUserProfile(task.assigned_to);
    
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
        case 'in-progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
        case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
        default: return 'bg-secondary text-secondary-foreground';
      }
    };

    const getInitials = (name: string) => {
      return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    };

    const formatDate = (dateString: string | null) => {
      if (!dateString) return 'Not set';
      return new Date(dateString).toLocaleDateString();
    };

    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

    return (
      <div 
        className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer bg-card"
        onClick={() => handleTeamTaskClick(task)}
      >
        <div className="space-y-3">
          {/* Team Badge and Title */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                <Users className="h-3 w-3 mr-1" />
                Team Task
              </Badge>
              <Badge className={getStatusColor(task.status || 'pending')}>
                {task.status?.replace('-', ' ') || 'Pending'}
              </Badge>
            </div>
            <h3 className="font-semibold font-montserrat">{task.title}</h3>
          </div>

          {/* Assigned Member */}
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">
                {getInitials(assigneeProfile?.full_name || assigneeProfile?.email || 'U')}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">
              {assigneeProfile?.full_name || assigneeProfile?.email || 'Unknown User'}
            </span>
          </div>

          {/* Dates */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Due: {formatDate(task.due_date)}</span>
            <span>Created: {formatDate(task.created_at)}</span>
          </div>

          {isOverdue && (
            <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
              Overdue
            </Badge>
          )}
        </div>
      </div>
    );
  };

  const renderTasksContent = (tasks: Task[], type: 'individual' | 'team') => {
    if (tasks.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
            {type === 'individual' ? (
              <User className="h-12 w-12 text-muted-foreground" />
            ) : (
              <Users className="h-12 w-12 text-muted-foreground" />
            )}
          </div>
          <h3 className="text-lg font-semibold font-montserrat mb-2">
            No {type} tasks {individualFilter === 'all' && teamFilter === 'all' ? 'assigned' : `matching "${type === 'individual' ? individualFilter : teamFilter}" filter`}
          </h3>
          <p className="text-muted-foreground font-opensans">
            {individualFilter === 'all' && teamFilter === 'all' 
              ? `You haven't assigned any ${type} tasks yet.`
              : `Try adjusting the filter to see more tasks.`
            }
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.map((task: Task) => 
          type === 'individual' ? renderIndividualTaskCard(task) : <TeamTaskCard key={task.id} task={task} />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-montserrat text-foreground">Assigned Tasks</h1>
          <p className="text-muted-foreground font-opensans">
            View and manage all tasks you've assigned to employees
          </p>
        </div>
      </div>

      <Tabs defaultValue="individual" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="individual" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Individual Tasks ({processedTasks.allIndividualTasks.length})
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Tasks ({processedTasks.allTeamTasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="space-y-6">
          {/* Status Filters */}
          <div className="space-y-4">
            <StatusFilter
              activeFilter={individualFilter}
              onFilterChange={setIndividualFilter}
              counts={processedTasks.individualCounts}
            />
          </div>
          
          {/* Tasks Content */}
          {renderTasksContent(processedTasks.individualTasks, 'individual')}
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          {/* Status Filters */}
          <div className="space-y-4">
            <StatusFilter
              activeFilter={teamFilter}
              onFilterChange={setTeamFilter}  
              counts={processedTasks.teamCounts}
            />
          </div>
          
          {/* Tasks Content */}
          {renderTasksContent(processedTasks.teamTasks, 'team')}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
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

      <AdminRatingDialog
        open={ratingDialogOpen}
        onOpenChange={setRatingDialogOpen}
        onSave={handleSaveRating}
        task={tasks.find((t: Task) => t.id === selectedTaskForRating) || null}
      />

      <TeamTaskDetailPanel
        task={selectedTeamTask}
        open={teamTaskDetailOpen}
        onOpenChange={setTeamTaskDetailOpen}
      />
    </div>
  );
};

export default AssignedTasks;