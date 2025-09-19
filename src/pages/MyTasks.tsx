
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, CheckCircle, XCircle, AlertCircle, Clock, User, Star, RefreshCw } from 'lucide-react';
import TaskCard from '@/components/Tasks/TaskCard';
import TaskEditDialog from '@/components/Tasks/TaskEditDialog';
import AdminRatingDialog from '@/components/Tasks/AdminRatingDialog';
import CreditPointsDialog from '@/components/Admin/CreditPointsDialog';
import { apiService } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Task } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useTasks } from '@/hooks/useTasks';

const MyTasks = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [creditPointsDialogOpen, setCreditPointsDialogOpen] = useState(false);
  const [selectedTaskForRating, setSelectedTaskForRating] = useState<Task | null>(null);
  const [selectedTaskForCredits, setSelectedTaskForCredits] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const isAdmin = userRole?.role === 'admin';

  // Use the new useTasks hook for tasks assigned to current user (excluding self-tasks)
  const { data: allTasks = [], loading, error, reload } = useTasks('my');
  
  // Filter out self-tasks - they should only appear in individual tasks view
  const tasks = allTasks.filter((task: Task) => task.task_type !== 'self');

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) => 
      apiService.updateTask(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-my'] });
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

  // Delete task mutation (only for self-created tasks or admin)
  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => apiService.deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-my'] });
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

  // Filter tasks based on search and filters
  const filteredTasks = tasks.filter((task: Task) => {
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
    overdue: filteredTasks.filter(task => task.status === 'overdue'),
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setEditDialogOpen(true);
  };

  const handleSaveTask = (task: Task) => {
    updateTaskMutation.mutate({
      id: task.id,
      updates: task,
    });
    setEditDialogOpen(false);
  };

  const handleDeleteTask = (taskId: string) => {
    const task = tasks.find((t: Task) => t.id === taskId);
    if (isAdmin || (task && (task.assigned_by === user?.id || task.assigned_to === user?.id))) {
      deleteTaskMutation.mutate(taskId);
    } else {
      toast({
        title: "Access Denied",
        description: "You can only delete your own tasks",
        variant: "destructive",
      });
    }
    setEditDialogOpen(false);
  };

  const handleResetTask = (taskId: string) => {
    updateTaskMutation.mutate({
      id: taskId,
      updates: { status: 'pending' },
    });
    setEditDialogOpen(false);
  };

  const handleRestartTask = (taskId: string) => {
    updateTaskMutation.mutate({
      id: taskId,
      updates: { status: 'in-progress' },
    });
    setEditDialogOpen(false);
  };

  const handleSetRating = (taskId: string, rating: number, comment: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      if (task.status === 'completed' && isAdmin) {
        // Open credit points dialog instead
        setSelectedTaskForCredits(task);
        setCreditPointsDialogOpen(true);
      } else {
        setSelectedTaskForRating(task);
        setRatingDialogOpen(true);
      }
    }
  };

  const handleSaveCreditPoints = (taskId: string, creditPoints: number, comment: string) => {
    updateTaskMutation.mutate({
      id: taskId,
      updates: {
        credit_points: creditPoints,
        admin_comment: comment,
      },
    });
    setCreditPointsDialogOpen(false);
    setSelectedTaskForCredits(null);
  };

  const handleSaveRating = (rating: number, comment: string) => {
    if (selectedTaskForRating) {
      updateTaskMutation.mutate({
        id: selectedTaskForRating.id,
        updates: {
          admin_rating: rating,
          admin_comment: comment,
        },
      });
      setRatingDialogOpen(false);
      setSelectedTaskForRating(null);
    }
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
        <p className="text-destructive mb-4">Failed to load your tasks</p>
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
          <h1 className="text-3xl font-bold text-foreground">My Tasks</h1>
          <p className="text-muted-foreground">Tasks assigned to you</p>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
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
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
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
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{tasksByStatus.pending.length}</p>
              </div>
              <Clock className="h-8 w-8 text-pending-yellow" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{tasksByStatus['in-progress'].length}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-progress-blue" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{tasksByStatus.completed.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-completed-green" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold">{tasksByStatus.overdue.length}</p>
              </div>
              <XCircle className="h-8 w-8 text-overdue-red" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks Grid */}
      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground mb-2">No tasks yet</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                  ? "Try adjusting your filters or search terms"
                  : "No tasks have been assigned to you yet"
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Overdue Tasks */}
          {tasksByStatus.overdue.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-overdue-red mb-4">
                Overdue Tasks ({tasksByStatus.overdue.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tasksByStatus.overdue.map((task: Task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    showAdminFeatures={isAdmin}
                    onSetRating={handleSetRating}
                  />
                ))}
              </div>
            </div>
          )}

          {/* In Progress Tasks */}
          {tasksByStatus['in-progress'].length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-progress-blue mb-4">
                In Progress ({tasksByStatus['in-progress'].length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tasksByStatus['in-progress'].map((task: Task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    showAdminFeatures={isAdmin}
                    onSetRating={handleSetRating}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Pending Tasks */}
          {tasksByStatus.pending.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Pending ({tasksByStatus.pending.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tasksByStatus.pending.map((task: Task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    showAdminFeatures={isAdmin}
                    onSetRating={handleSetRating}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Tasks */}
          {tasksByStatus.completed.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-completed-green mb-4">
                Completed ({tasksByStatus.completed.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tasksByStatus.completed.map((task: Task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    showAdminFeatures={isAdmin}
                    onSetRating={handleSetRating}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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

      <AdminRatingDialog
        open={ratingDialogOpen}
        onOpenChange={setRatingDialogOpen}
        onSave={handleSaveRating}
        task={selectedTaskForRating}
      />

      <CreditPointsDialog
        task={selectedTaskForCredits}
        open={creditPointsDialogOpen}
        onOpenChange={setCreditPointsDialogOpen}
        onSave={handleSaveCreditPoints}
      />
    </div>
  );
};

export default MyTasks;
