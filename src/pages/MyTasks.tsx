import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, Bell } from 'lucide-react';
import TaskCard from '@/components/Tasks/TaskCard';
import TaskEditDialog from '@/components/Tasks/TaskEditDialog';
import ReminderDialog from '@/components/Tasks/ReminderDialog';
import AdminRatingDialog from '@/components/Tasks/AdminRatingDialog';
import { apiService } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Task } from '@/types';
import { useToast } from '@/hooks/use-toast';

const MyTasks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [reminderTaskId, setReminderTaskId] = useState<string>('');
  const [reminderTaskTitle, setReminderTaskTitle] = useState<string>('');
  const [ratingTask, setRatingTask] = useState<{ id: string; title: string; rating?: number; comment?: string } | null>(null);

  // Fetch user's tasks from backend
  const { data: allTasks = [], isLoading, error } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => apiService.getTasks(),
  });

  // Filter to show only user's tasks - in local mode, tasks are assigned to 'current-user'
  const useLocalMode = import.meta.env.VITE_DATA_MODE === 'local' || 
                      import.meta.env.VITE_DATA_MODE === undefined;
  
  const tasks = allTasks.filter((task: Task) => 
    useLocalMode ? task.assigned_to === 'current-user' : task.assigned_to === user?.id
  );

  // Check if user is admin (you may need to adjust this based on your user role system)
  const isAdmin = user?.user_metadata?.role === 'admin' || user?.email?.includes('admin');

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, task }: { id: string; task: Partial<Task> }) => 
      apiService.updateTask(id, task),
    onSuccess: () => {
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

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteTask(id),
    onSuccess: () => {
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

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setEditDialogOpen(true);
  };

  const handleSaveTask = (task: Task) => {
    updateTaskMutation.mutate({ id: task.id, task });
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTaskMutation.mutate(taskId);
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

  const handleSetRating = (taskId: string, currentRating: number, currentComment: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setRatingTask({
        id: taskId,
        title: task.title,
        rating: currentRating,
        comment: currentComment
      });
      setRatingDialogOpen(true);
    }
  };

  const handleSaveRating = (rating: number, comment: string) => {
    if (ratingTask) {
      updateTaskMutation.mutate({
        id: ratingTask.id,
        task: {
          admin_rating: rating,
          admin_comment: comment
        }
      });
      setRatingDialogOpen(false);
      setRatingTask(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-luxury-gold"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <p className="text-blocked-red mb-4">
          {useLocalMode 
            ? "Failed to load tasks from local storage." 
            : "Failed to load tasks. Please check your backend connection."
          }
        </p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-montserrat text-foreground">My Tasks</h1>
          <p className="text-muted-foreground font-opensans">
            Manage your assigned tasks and set reminders
            {useLocalMode && (
              <span className="ml-2 text-xs bg-luxury-gold/20 text-luxury-gold px-2 py-1 rounded">
                Local Mode
              </span>
            )}
          </p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
            <Plus className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold font-montserrat mb-2">No tasks assigned</h3>
          <p className="text-muted-foreground font-opensans mb-4">
            You don't have any tasks assigned to you yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task: Task) => (
            <div key={task.id} className="relative group">
              <TaskCard
                task={task}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                onStatusChange={(taskId, status) => 
                  updateTaskMutation.mutate({ id: taskId, task: { status } })
                }
                showAdminFeatures={isAdmin}
                onSetRating={handleSetRating}
              />
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-16 opacity-0 group-hover:opacity-100 transition-opacity border-luxury-gold text-luxury-gold hover:bg-luxury-gold hover:text-charcoal-black"
                onClick={() => handleSetReminder(task.id, task.title)}
              >
                <Bell className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

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
        taskTitle={ratingTask?.title || ''}
        currentRating={ratingTask?.rating}
        currentComment={ratingTask?.comment}
      />
    </div>
  );
};

export default MyTasks;
