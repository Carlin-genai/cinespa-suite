
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Plus, Filter, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TaskCard from '@/components/Tasks/TaskCard';
import TaskCreateDialog from '@/components/Tasks/TaskCreateDialog';
import TaskEditDialog from '@/components/Tasks/TaskEditDialog';
import AdminRatingDialog from '@/components/Tasks/AdminRatingDialog';
import { apiService } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Task } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const MyTasks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Check if we're in local mode
  const isLocalMode = import.meta.env.VITE_DATA_MODE === 'local' || 
                     import.meta.env.VITE_DATA_MODE === undefined;

  // Get current user ID (handle both Supabase and local mode)
  const currentUserId = isLocalMode ? 'current-user' : user?.id;

  // Fetch user's tasks from backend
  const { data: allTasks = [], isLoading, error } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: () => apiService.getTasks(),
  });

  // Filter tasks assigned to current user
  const userTasks = allTasks.filter((task: Task) => task.assigned_to === currentUserId);

  // Apply filters
  const filteredTasks = userTasks.filter((task: Task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Group tasks by status
  const tasksByStatus = {
    pending: filteredTasks.filter(task => task.status === 'pending'),
    'in-progress': filteredTasks.filter(task => task.status === 'in-progress'),
    completed: filteredTasks.filter(task => task.status === 'completed'),
    overdue: filteredTasks.filter(task => task.status === 'overdue')
  };

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: (task: Partial<Task>) => apiService.createTask({
      ...task,
      assigned_to: currentUserId,
      assigned_by: currentUserId, // Self-assigned task
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: "Success",
        description: "Personal task created successfully",
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

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, task }: { id: string; task: Partial<Task> }) => 
      apiService.updateTask(id, task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
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
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
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

  const handleCreateTask = (task: Partial<Task>) => {
    createTaskMutation.mutate(task);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setEditDialogOpen(true);
  };

  const handleSaveTask = (task: Task) => {
    updateTaskMutation.mutate({ id: task.id, task });
    setEditDialogOpen(false);
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTaskMutation.mutate(taskId);
    setEditDialogOpen(false);
  };

  const handleResetTask = (taskId: string) => {
    updateTaskMutation.mutate({ 
      id: taskId, 
      task: { status: 'pending' }
    });
    setEditDialogOpen(false);
  };

  const handleRestartTask = (taskId: string) => {
    updateTaskMutation.mutate({ 
      id: taskId, 
      task: { status: 'in-progress' }
    });
    setEditDialogOpen(false);
  };

  const handleSetRating = (taskId: string, rating: number, comment: string) => {
    setSelectedTask(userTasks.find(t => t.id === taskId) || null);
    setRatingDialogOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
  };

  const statusColors = {
    'pending': 'bg-not-started-beige text-charcoal-black',
    'in-progress': 'bg-progress-blue text-white',
    'overdue': 'bg-blocked-red text-white',
    'completed': 'bg-completed-green text-white'
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
        <p className="text-blocked-red mb-4">Failed to load your tasks.</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-montserrat text-foreground">My Tasks</h1>
          <p className="text-muted-foreground font-opensans">
            Manage your personal and assigned tasks
            {isLocalMode && (
              <Badge variant="outline" className="ml-2 border-luxury-gold text-luxury-gold">
                Local Mode
              </Badge>
            )}
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="gradient-gold text-charcoal-black hover:shadow-lg hover:shadow-luxury-gold/20"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Personal Task
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-background to-muted">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold">{userTasks.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-luxury-gold" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-completed-green/10 to-completed-green/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-completed-green">{tasksByStatus.completed.length}</p>
              </div>
              <div className="text-xs text-muted-foreground">
                {userTasks.length > 0 ? Math.round((tasksByStatus.completed.length / userTasks.length) * 100) : 0}%
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-progress-blue/10 to-progress-blue/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-progress-blue">{tasksByStatus['in-progress'].length}</p>
              </div>
              <Clock className="h-8 w-8 text-progress-blue" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blocked-red/10 to-blocked-red/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-blocked-red">{tasksByStatus.overdue.length}</p>
              </div>
              {tasksByStatus.overdue.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  Attention
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={clearFilters}>
              <Filter className="mr-2 h-4 w-4" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Display */}
      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
              <Calendar className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold font-montserrat mb-2">
              {userTasks.length === 0 ? 'No tasks yet' : 'No tasks match your filters'}
            </h3>
            <p className="text-muted-foreground font-opensans text-center mb-4">
              {userTasks.length === 0 
                ? 'Create your first personal task to get started with productivity tracking'
                : 'Try adjusting your search criteria or clearing filters'
              }
            </p>
            {userTasks.length === 0 && (
              <Button onClick={() => setCreateDialogOpen(true)} className="gradient-gold text-charcoal-black">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Task
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Overdue Tasks */}
          {tasksByStatus.overdue.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-semibold text-blocked-red">Overdue Tasks</h2>
                <Badge className={cn("text-xs", statusColors.overdue)}>
                  {tasksByStatus.overdue.length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tasksByStatus.overdue.map((task: Task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onStatusChange={(taskId, status) => 
                      updateTaskMutation.mutate({ id: taskId, task: { status } })
                    }
                    showAdminFeatures={false}
                    onSetRating={handleSetRating}
                  />
                ))}
              </div>
            </div>
          )}

          {/* In Progress Tasks */}
          {tasksByStatus['in-progress'].length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-semibold text-progress-blue">In Progress</h2>
                <Badge className={cn("text-xs", statusColors['in-progress'])}>
                  {tasksByStatus['in-progress'].length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tasksByStatus['in-progress'].map((task: Task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onStatusChange={(taskId, status) => 
                      updateTaskMutation.mutate({ id: taskId, task: { status } })
                    }
                    showAdminFeatures={false}
                    onSetRating={handleSetRating}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Pending Tasks */}
          {tasksByStatus.pending.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-semibold text-foreground">Pending Tasks</h2>
                <Badge className={cn("text-xs", statusColors.pending)}>
                  {tasksByStatus.pending.length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tasksByStatus.pending.map((task: Task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onStatusChange={(taskId, status) => 
                      updateTaskMutation.mutate({ id: taskId, task: { status } })
                    }
                    showAdminFeatures={false}
                    onSetRating={handleSetRating}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Tasks */}
          {tasksByStatus.completed.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-semibold text-completed-green">Completed Tasks</h2>
                <Badge className={cn("text-xs", statusColors.completed)}>
                  {tasksByStatus.completed.length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tasksByStatus.completed.map((task: Task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onStatusChange={(taskId, status) => 
                      updateTaskMutation.mutate({ id: taskId, task: { status } })
                    }
                    showAdminFeatures={false}
                    onSetRating={handleSetRating}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <TaskCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSave={handleCreateTask}
      />

      <TaskEditDialog
        task={selectedTask}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        onReset={handleResetTask}
        onRestart={handleRestartTask}
      />

      <AdminRatingDialog
        open={ratingDialogOpen}
        onOpenChange={setRatingDialogOpen}
        taskTitle={selectedTask?.title || ''}
        currentRating={selectedTask?.admin_rating}
        currentComment={selectedTask?.admin_comment}
        onSave={(rating, comment) => {
          if (selectedTask) {
            updateTaskMutation.mutate({
              id: selectedTask.id,
              task: { admin_rating: rating, admin_comment: comment }
            });
          }
          setRatingDialogOpen(false);
        }}
      />
    </div>
  );
};

export default MyTasks;
