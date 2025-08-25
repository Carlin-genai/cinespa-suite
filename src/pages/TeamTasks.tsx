import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TaskCard from '@/components/Tasks/TaskCard';
import TaskEditDialog from '@/components/Tasks/TaskEditDialog';
import ReminderDialog from '@/components/Tasks/ReminderDialog';
import { Plus, Search, Filter, Bell, Edit, Users } from 'lucide-react';
import { supabaseApi } from '@/lib/supabaseApi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Task } from '@/types';
import { useToast } from '@/hooks/use-toast';

const TeamTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [selectedTaskForReminder, setSelectedTaskForReminder] = useState<Task | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all team tasks
  const { data: tasksData, isLoading } = useQuery<Task[]>({
    queryKey: ['team-tasks'],
    queryFn: supabaseApi.getTeamTasks,
  });

  useEffect(() => {
    if (tasksData && Array.isArray(tasksData)) {
      setTasks(tasksData);
    }
  }, [tasksData]);

  // Mutations
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, task }: { id: string; task: Partial<Task> }) => supabaseApi.updateTask(id, task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-tasks'] });
      toast({ title: 'Success', description: 'Task updated successfully!' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update task', variant: 'destructive' });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => supabaseApi.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-tasks'] });
      toast({ title: 'Success', description: 'Task deleted successfully!' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete task', variant: 'destructive' });
    }
  });

  const createReminderMutation = useMutation({
    mutationFn: (reminder: { task_id: string; message: string; reminder_time: string }) => 
      supabaseApi.createReminder(reminder),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Reminder set successfully!' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to set reminder', variant: 'destructive' });
    }
  });

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Event handlers - same as MyTasks
  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowEditDialog(true);
  };

  const handleSaveTask = (updatedTask: Task) => {
    updateTaskMutation.mutate({ id: updatedTask.id, task: updatedTask });
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTaskMutation.mutate(taskId);
  };

  const handleResetTask = (taskId: string) => {
    updateTaskMutation.mutate({ 
      id: taskId, 
      task: { status: 'pending', notes: '' } 
    });
  };

  const handleRestartTask = (taskId: string) => {
    updateTaskMutation.mutate({ 
      id: taskId, 
      task: { status: 'in-progress' } 
    });
  };

  const handleSetReminder = (task: Task) => {
    setSelectedTaskForReminder(task);
    setShowReminderDialog(true);
  };

  const handleSaveReminder = (reminder: { message: string; reminder_time: string }) => {
    if (selectedTaskForReminder) {
      createReminderMutation.mutate({
        task_id: selectedTaskForReminder.id,
        ...reminder
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-montserrat text-foreground flex items-center gap-3">
            <Users className="h-8 w-8 text-luxury-gold" />
            Team Tasks
          </h1>
          <p className="text-muted-foreground font-opensans mt-1">
            View and manage all team tasks across the organization.
          </p>
        </div>
        <Button className="gradient-gold text-charcoal-black hover:opacity-90">
          <Plus className="mr-2 h-4 w-4" />
          Assign Task
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold font-montserrat text-foreground">{tasks.length}</div>
            <p className="text-sm text-muted-foreground">Total Team Tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold font-montserrat text-progress-blue">{tasks.filter(t => t.status === 'in-progress').length}</div>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold font-montserrat text-completed-green">{tasks.filter(t => t.status === 'completed').length}</div>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold font-montserrat text-blocked-red">{tasks.filter(t => t.status === 'overdue').length}</div>
            <p className="text-sm text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters - same as MyTasks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-montserrat text-foreground flex items-center gap-2">
            <Filter className="h-5 w-5 text-luxury-gold" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
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
              <SelectTrigger>
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

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setPriorityFilter('all');
              }}
              className="border-luxury-gold text-luxury-gold hover:bg-luxury-gold hover:text-charcoal-black"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Grid - same as MyTasks but with team view */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTasks.map((task) => (
          <Card key={task.id} className="transition-all duration-300 hover:shadow-lg hover:shadow-luxury-gold/20">
            <TaskCard
              task={task}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
            />
            <div className="p-4 pt-0 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEditTask(task)}
                className="flex-1 border-luxury-gold text-luxury-gold hover:bg-luxury-gold hover:text-charcoal-black"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSetReminder(task)}
                className="flex-1 border-progress-blue text-progress-blue hover:bg-progress-blue hover:text-white"
              >
                <Bell className="mr-2 h-4 w-4" />
                Reminder
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredTasks.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-muted-foreground">
              <Users className="mx-auto h-12 w-12 mb-4 text-luxury-gold" />
              <p className="font-opensans text-lg mb-2">No team tasks found</p>
              <p className="text-sm">Try adjusting your filters or create new tasks for the team.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs - same as MyTasks */}
      <TaskEditDialog
        task={editingTask}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        onReset={handleResetTask}
        onRestart={handleRestartTask}
      />

      <ReminderDialog
        open={showReminderDialog}
        onOpenChange={setShowReminderDialog}
        onSave={handleSaveReminder}
        taskId={selectedTaskForReminder?.id || ''}
        taskTitle={selectedTaskForReminder?.title || ''}
      />
    </div>
  );
};

export default TeamTasks;
