import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Clock, User, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import TaskCard from '@/components/Tasks/TaskCard';
import TaskCreateDialog from '@/components/Tasks/TaskCreateDialog';
import TaskEditDialog from '@/components/Tasks/TaskEditDialog';
import { apiService } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Task } from '@/types';
import { useToast } from '@/hooks/use-toast';

const SelfTasks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assignedEmployee, setAssignedEmployee] = useState<string>(user?.id || '');

  // Fetch tasks created by the signed-in user
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['self-tasks'],
    queryFn: async () => {
      const allTasks = await apiService.getTasks();
      return allTasks.filter((task: Task) => 
        task.assigned_by === user?.id && task.assigned_to === user?.id
      );
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: (task: Partial<Task>) => apiService.createTask({
      ...task,
      assigned_to: assignedEmployee,
      assigned_by: user?.id,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-tasks'] });
      toast({ title: "Success", description: "Task created successfully" });
      setCreateDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create task", variant: "destructive" });
    },
  });

  // Update and delete mutations
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) => apiService.updateTask(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-tasks'] });
      toast({ title: "Success", description: "Task updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update task", variant: "destructive" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => apiService.deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-tasks'] });
      toast({ title: "Success", description: "Task deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete task", variant: "destructive" });
    },
  });

  // Filters
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

  // Handlers
  const handleCreateTask = (task: Partial<Task>) => createTaskMutation.mutate(task);
  const handleEditTask = (task: Task) => { setSelectedTask(task); setEditDialogOpen(true); };
  const handleUpdateTask = (task: Task) => { updateTaskMutation.mutate({ id: task.id, updates: task }); setEditDialogOpen(false); };
  const handleDeleteTask = (taskId: string) => { deleteTaskMutation.mutate(taskId); setEditDialogOpen(false); };
  const handleResetTask = (taskId: string) => { updateTaskMutation.mutate({ id: taskId, updates: { status: 'pending' } }); setEditDialogOpen(false); };
  const handleRestartTask = (taskId: string) => { updateTaskMutation.mutate({ id: taskId, updates: { status: 'in-progress' } }); setEditDialogOpen(false); };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-400"></div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Self Tasks</h1>
          <p className="text-muted-foreground">Manage your personal tasks and goals</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="bg-rose-400 hover:bg-rose-500 text-white">
          <Plus className="mr-2 h-4 w-4" /> Create Task
        </Button>
      </div>

      {/* Filters & Search */}
      <Card>
        <CardContent className="pt-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tasks..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium">Pending</p><p className="text-2xl font-bold">{tasksByStatus.pending.length}</p></div><Clock className="h-8 w-8 text-yellow-500" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium">In Progress</p><p className="text-2xl font-bold">{tasksByStatus['in-progress'].length}</p></div><AlertCircle className="h-8 w-8" style={{ color: 'hsl(206.6, 89.7%, 54.1%)' }} /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium">Completed</p><p className="text-2xl font-bold">{tasksByStatus.completed.length}</p></div><CheckCircle className="h-8 w-8" style={{ color: 'hsl(120, 100%, 0.8%)' }} /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium">Overdue</p><p className="text-2xl font-bold">{tasksByStatus.overdue.length}</p></div><XCircle className="h-8 w-8" style={{ color: 'hsl(9.4, 100%, 50%)' }} /></div></CardContent></Card>
      </div>

      {/* Task Cards */}
      {filteredTasks.length === 0 ? (
        <Card><CardContent className="pt-6 text-center"><User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" /><h3 className="text-lg font-medium mb-2">No tasks found</h3><p className="text-muted-foreground mb-4">{searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' ? "Try adjusting your filters" : "Create your first task"}</p><Button onClick={() => setCreateDialogOpen(true)} className="bg-rose-400 hover:bg-rose-500 text-white"><Plus className="mr-2 h-4 w-4" /> Create Task</Button></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map((task: Task) => <TaskCard key={task.id} task={task} onEdit={handleEditTask} onDelete={handleDeleteTask} />)}
        </div>
      )}

      {/* Dialogs */}
      <TaskCreateDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onSave={handleCreateTask} isPersonalTask={true} />
      <TaskEditDialog task={selectedTask} open={editDialogOpen} onOpenChange={setEditDialogOpen} onSave={handleUpdateTask} onDelete={handleDeleteTask} onReset={handleResetTask} onRestart={handleRestartTask} />
    </div>
  );
};

export default SelfTasks;
