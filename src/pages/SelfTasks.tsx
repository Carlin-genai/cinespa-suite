import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Clock, CheckCircle, XCircle, AlertCircle, User, RefreshCw } from 'lucide-react';
import TaskCard from '@/components/Tasks/TaskCard';
import TaskCreateDialog from '@/components/Tasks/TaskCreateDialog';
import TaskEditDialog from '@/components/Tasks/TaskEditDialog';
import { apiService } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Task } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useTasks } from '@/hooks/useTasks';

const SelfTasks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Use the new useTasks hook for self-assigned tasks
  const { data: tasks = [], loading, error, reload } = useTasks('self');

  // ✅ Create task mutation (self-assigned only)
  const createTaskMutation = useMutation({
    mutationFn: async (task: Partial<Task>) => {
      console.log('[SelfTasks] Creating self task:', task);
      
      if (!user?.id) {
        throw new Error('You must be logged in to create tasks');
      }
      
      // Ensure tomorrow's date if no due_date provided
      const defaultDue = new Date();
      defaultDue.setDate(defaultDue.getDate() + 1);
      defaultDue.setHours(17, 0, 0, 0); // 5PM tomorrow
      
      const taskData = {
        title: task.title?.trim() || '',
        description: task.description?.trim() || '',
        status: 'pending' as const,
        priority: 'medium' as const,
        assigned_to: user.id,
        assigned_by: user.id,
        due_date: (task as any).due_date || defaultDue.toISOString(),
        notes: task.notes || undefined,
        time_limit: (task as any).time_limit || undefined,
        credit_points: (task as any).credit_points || 0,
        attachment_url: (task as any).attachment_url || undefined,
        is_self_task: true,
        ...task, // Override with any provided values
      };
      
      console.log('[SelfTasks] Final task data:', taskData);
      return apiService.createTask(taskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] }); // Also refresh dashboard
      toast({ title: 'Success', description: 'Task created successfully' });
      setCreateDialogOpen(false);
      // Clear form
      setTaskTitle('');
      setTaskDescription('');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create task',
        variant: 'destructive',
      });
      console.error('Create task error:', error);
    },
  });

  // ✅ Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) =>
      apiService.updateTask(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-tasks'] });
      toast({ title: 'Success', description: 'Task updated successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update task',
        variant: 'destructive',
      });
      console.error('Update task error:', error);
    },
  });

  // ✅ Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => apiService.deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-tasks'] });
      toast({ title: 'Success', description: 'Task deleted successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to delete task',
        variant: 'destructive',
      });
      console.error('Delete task error:', error);
    },
  });

  // ✅ Filter tasks based on search and filters
  const filteredTasks = tasks.filter((task: Task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const tasksByStatus = {
    pending: filteredTasks.filter((task) => task.status === 'pending'),
    'in-progress': filteredTasks.filter((task) => task.status === 'in-progress'),
    completed: filteredTasks.filter((task) => task.status === 'completed'),
    overdue: filteredTasks.filter((task) => task.status === 'overdue'),
  };

  const handleCreateTask = (task: Partial<Task> & { attachments?: File[] }) => createTaskMutation.mutate(task);
  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setEditDialogOpen(true);
  };
  const handleUpdateTask = (task: Task) => {
    updateTaskMutation.mutate({ id: task.id, updates: task });
    setEditDialogOpen(false);
  };
  const handleDeleteTask = (taskId: string) => {
    deleteTaskMutation.mutate(taskId);
    setEditDialogOpen(false);
  };

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
        <p className="text-destructive mb-4">Failed to load your self tasks</p>
        <p className="text-muted-foreground mb-4 text-sm">{error.message}</p>
        <Button onClick={reload} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Self Tasks</h1>
          <p className="text-muted-foreground">Manage your personal tasks</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> Create Self Task
        </Button>
      </div>

      {/* Create Task Form */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium">Task Title *</label>
            <Input
              placeholder="Enter task title..."
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium">Task Description</label>
            <Textarea
              placeholder="Enter task description..."
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              rows={4}
            />
          </div>

          <Button 
            onClick={() => {
              if (!taskTitle.trim()) {
                toast({
                  title: 'Error',
                  description: 'Please enter a task title',
                  variant: 'destructive',
                });
                return;
              }
              createTaskMutation.mutate({
                title: taskTitle.trim(),
                description: taskDescription.trim() || undefined,
              });
            }}
            disabled={createTaskMutation.isPending}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="mr-2 h-4 w-4" /> 
            {createTaskMutation.isPending ? 'Creating...' : 'Create Self Task'}
          </Button>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6 flex gap-4">
          <Input
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Tasks Grid */}
      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground mb-2">No self tasks yet</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                  ? "Try adjusting your filters or search terms"
                  : "Create your first personal task to get started"
                }
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create Self Task
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map((task: Task) => (
            <TaskCard key={task.id} task={task} onEdit={handleEditTask} onDelete={handleDeleteTask} />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <TaskCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSave={handleCreateTask}
        isPersonalTask={true}
      />
      <TaskEditDialog
        task={selectedTask}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleUpdateTask}
        onDelete={handleDeleteTask}
        onReset={() => {}}
        onRestart={() => {}}
      />
    </div>
  );
};

export default SelfTasks;
