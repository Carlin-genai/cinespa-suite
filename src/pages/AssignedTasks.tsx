import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, User, Bell, Settings } from 'lucide-react';
import TaskCard from '@/components/Tasks/TaskCard';
import TaskEditDialog from '@/components/Tasks/TaskEditDialog';
import ReminderDialog from '@/components/Tasks/ReminderDialog';
import AdminRatingDialog from '@/components/Tasks/AdminRatingDialog';
import { apiService } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Task } from '@/types';
import { useToast } from '@/hooks/use-toast';

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

  // Fetch all tasks assigned by the current admin
  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['assigned-tasks'],
    queryFn: () => apiService.getTasks(),
    enabled: userRole?.role === 'admin',
  });

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <p className="text-overdue-red mb-4">Failed to load assigned tasks. Please check your backend connection.</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  // Filter tasks assigned by the current admin
  const assignedTasks = tasks.filter((task: Task) => task.assigned_by === user?.id);
  
  // Separate individual and team tasks
  const individualTasks = assignedTasks.filter((task: Task) => !task.team_id);
  const teamTasks = assignedTasks.filter((task: Task) => task.team_id);

  // Group tasks by status for both individual and team
  const groupTasksByStatus = (tasksList: Task[]) => ({
    pending: tasksList.filter((task: Task) => task.status === 'pending'),
    inProgress: tasksList.filter((task: Task) => task.status === 'in-progress'),
    completed: tasksList.filter((task: Task) => task.status === 'completed'),
    overdue: tasksList.filter((task: Task) => task.status === 'overdue'),
  });

  const individualTaskGroups = groupTasksByStatus(individualTasks);
  const teamTaskGroups = groupTasksByStatus(teamTasks);

  const renderTaskSection = (title: string, tasks: Task[], colorClass: string) => {
    if (tasks.length === 0) return null;

    return (
      <div>
        <h2 className={`text-xl font-semibold mb-4 flex items-center gap-2 ${colorClass}`}>
          {title} ({tasks.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task: Task) => (
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
          ))}
        </div>
      </div>
    );
  };

  const renderTasksByType = (taskGroups: any, type: string) => {
    const totalTasks = Object.values(taskGroups).reduce((sum: number, tasks: any) => sum + tasks.length, 0);

    if (totalTasks === 0) {
      return (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
            {type === 'individual' ? (
              <User className="h-12 w-12 text-muted-foreground" />
            ) : (
              <Users className="h-12 w-12 text-muted-foreground" />
            )}
          </div>
          <h3 className="text-lg font-semibold font-montserrat mb-2">No {type} tasks assigned</h3>
          <p className="text-muted-foreground font-opensans">
            You haven't assigned any {type} tasks yet.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {renderTaskSection('Overdue Tasks', taskGroups.overdue, 'text-overdue-red')}
        {renderTaskSection('In Progress', taskGroups.inProgress, 'text-progress-blue')}
        {renderTaskSection('Pending', taskGroups.pending, 'text-foreground')}
        {renderTaskSection('Completed', taskGroups.completed, 'text-completed-green')}
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
            Individual ({individualTasks.length})
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team ({teamTasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="space-y-6">
          {renderTasksByType(individualTaskGroups, 'individual')}
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          {renderTasksByType(teamTaskGroups, 'team')}
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
    </div>
  );
};

export default AssignedTasks;