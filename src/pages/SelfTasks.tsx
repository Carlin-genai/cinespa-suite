
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter, Calendar, Clock, User, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import TaskCard from '@/components/Tasks/TaskCard';
import TaskEditDialog from '@/components/Tasks/TaskEditDialog';
import { apiService } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Task } from '@/types';
import { useToast } from '@/hooks/use-toast';

const SelfTasks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [taskDetails, setTaskDetails] = useState('');
  const [employees, setEmployees] = useState([]);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch employees from backend
  React.useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch('/api/employees', { method: 'GET' });
        if (response.ok) {
          const data = await response.json();
          setEmployees(data);
        }
      } catch (error) {
        console.error('Failed to fetch employees:', error);
      }
    };
    fetchEmployees();
  }, []);

  // Fetch self-created tasks
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['self-tasks'],
    queryFn: async () => {
      const allTasks = await apiService.getTasks();
      // Filter for tasks created by the current user (self-tasks)
      return allTasks.filter((task: Task) => 
        task.assigned_by === user?.id && task.assigned_to === user?.id
      );
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: (task: Partial<Task>) => apiService.createTask({
      ...task,
      assigned_to: user?.id,
      assigned_by: user?.id,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-tasks'] });
      toast({
        title: "Success",
        description: "Self-task created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create self-task",
        variant: "destructive",
      });
      console.error('Create self-task error:', error);
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) => 
      apiService.updateTask(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-tasks'] });
      toast({
        title: "Success",
        description: "Self-task updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update self-task",
        variant: "destructive",
      });
      console.error('Update self-task error:', error);
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => apiService.deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-tasks'] });
      toast({
        title: "Success",
        description: "Self-task deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete self-task",
        variant: "destructive",
      });
      console.error('Delete self-task error:', error);
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

  const handleCreateTask = async () => {
    if (!selectedEmployee || !taskDetails.trim()) {
      toast({
        title: "Error",
        description: "Please select an employee and enter task details",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee: selectedEmployee,
          context: taskDetails
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Task created successfully",
        });
        // Clear form
        setSelectedEmployee('');
        setTaskDetails('');
        // Refresh tasks
        queryClient.invalidateQueries({ queryKey: ['self-tasks'] });
      } else {
        const errorText = await response.text();
        toast({
          title: "Error",
          description: errorText || "Failed to create task",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setEditDialogOpen(true);
  };

  const handleUpdateTask = (task: Task) => {
    updateTaskMutation.mutate({
      id: task.id,
      updates: task,
    });
    setEditDialogOpen(false);
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTaskMutation.mutate(taskId);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Self Tasks</h1>
          <p className="text-muted-foreground">Manage your personal tasks and goals</p>
        </div>
      </div>

      {/* Create Task Form */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="employeeSelect" className="block text-sm font-medium mb-2">
                Assign to Employee
              </label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger id="employeeSelect">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee: any) => (
                    <SelectItem key={employee.email || employee.id} value={employee.email || employee.id}>
                      {employee.name || employee.email || employee.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button 
                onClick={handleCreateTask}
                disabled={isCreating || !selectedEmployee || !taskDetails.trim()}
                className="bg-rose-400 hover:bg-rose-500 text-white mt-6"
              >
                {isCreating ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
          </div>
          <div>
            <label htmlFor="taskContext" className="block text-sm font-medium mb-2">
              Task Details
            </label>
            <textarea
              id="taskContext"
              value={taskDetails}
              onChange={(e) => setTaskDetails(e.target.value)}
              placeholder="Enter task details..."
              className="w-full p-3 border border-input rounded-md bg-background text-foreground min-h-[100px] resize-none"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search self-tasks..."
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
              <Clock className="h-8 w-8 text-yellow-500" />
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
              <AlertCircle className="h-8 w-8" style={{ color: '#2196F3' }} />
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
              <CheckCircle className="h-8 w-8" style={{ color: '#000400' }} />
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
              <XCircle className="h-8 w-8" style={{ color: '#FF2800' }} />
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
              <h3 className="text-lg font-medium text-foreground mb-2">No self-tasks found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                  ? "Try adjusting your filters or search terms"
                  : "Create your first self-task to get started"
                }
              </p>
              {!searchTerm && statusFilter === 'all' && priorityFilter === 'all' && (
                <Button
                  onClick={handleCreateTask}
                  disabled={!selectedEmployee || !taskDetails.trim()}
                  className="bg-rose-400 hover:bg-rose-500 text-white"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Self Task
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map((task: Task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <TaskEditDialog
        task={selectedTask}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleUpdateTask}
        onDelete={handleDeleteTask}
        onReset={handleResetTask}
        onRestart={handleRestartTask}
      />
    </div>
  );
};

export default SelfTasks;
