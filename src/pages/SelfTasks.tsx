import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Clock, CheckCircle, XCircle, AlertCircle, User } from 'lucide-react';
import TaskCard from '@/components/Tasks/TaskCard';
import TaskCreateDialog from '@/components/Tasks/TaskCreateDialog';
import TaskEditDialog from '@/components/Tasks/TaskEditDialog';
import { apiService } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Task } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const SelfTasks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [taskContext, setTaskContext] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // ✅ Fetch employees from Supabase profiles
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .order('full_name');
        
        if (error) {
          console.error('Error fetching employees:', error);
          // Fallback to mock data if Supabase fails
          setEmployees([
            { id: 'emp1', email: 'john@company.com', full_name: 'John Doe' },
            { id: 'emp2', email: 'jane@company.com', full_name: 'Jane Smith' },
            { id: 'emp3', email: 'mike@company.com', full_name: 'Mike Johnson' }
          ]);
        } else {
          setEmployees(data || []);
        }
      } catch (error) {
        console.error('Error fetching employees:', error);
        // Fallback to mock data
        setEmployees([
          { id: 'emp1', email: 'john@company.com', full_name: 'John Doe' },
          { id: 'emp2', email: 'jane@company.com', full_name: 'Jane Smith' },
          { id: 'emp3', email: 'mike@company.com', full_name: 'Mike Johnson' }
        ]);
      }
    };

    fetchEmployees();
  }, []);

  // ✅ Handle Create Task button click (Flask backend format)
  const handleCreateTaskClick = async () => {
    const employeeSelect = document.getElementById('employeeSelect') as (HTMLInputElement | HTMLSelectElement | null);
    const taskContextElement = document.getElementById('taskContext') as (HTMLTextAreaElement | HTMLInputElement | null);
    
    const selectedEmployeeEmail = employeeSelect?.value || selectedEmployee;
    const taskDetails = taskContextElement?.value || taskContext;

    if (!selectedEmployeeEmail || !taskDetails) {
      toast({
        title: 'Error',
        description: 'Please select an employee and enter task details',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee: selectedEmployeeEmail,
          context: taskDetails
        })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Task created successfully'
        });
        
        // Clear the form
        if (employeeSelect) employeeSelect.value = '';
        if (taskContextElement) taskContextElement.value = '';
        setSelectedEmployee('');
        setTaskContext('');
      } else {
        const errorText = await response.text();
        toast({
          title: 'Error',
          description: errorText || 'Failed to create task',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Network error: ${error}`,
        variant: 'destructive',
      });
    }
  };

  // ✅ Fetch self-created tasks
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['self-tasks'],
    queryFn: async () => {
      const allTasks = await apiService.getTasks();
      return allTasks.filter(
        (task: Task) => task.assigned_by === user?.id && task.assigned_to === user?.id
      );
    },
  });

  // ✅ Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: (task: Partial<Task>) =>
      apiService.createTask({
        ...task,
        assigned_to: selectedEmployee || user?.id,
        assigned_by: user?.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-tasks'] });
      toast({ title: 'Success', description: 'Task created successfully' });
      setCreateDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create task',
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

  const handleCreateTask = (task: Partial<Task>) => createTaskMutation.mutate(task);
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
          <h1 className="text-3xl font-bold">Self Tasks</h1>
          <p className="text-muted-foreground">Manage your personal tasks</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="bg-rose-400 text-white">
          <Plus className="mr-2 h-4 w-4" /> Create Self Task
        </Button>
      </div>

      {/* Create Task Form */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium">Assign to Employee *</label>
            <Select value={selectedEmployee} onValueChange={(val) => setSelectedEmployee(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee to assign" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.email}>
                    {(emp.full_name || emp.name || emp.email)} ({emp.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Hidden input to satisfy DOM API requirement */}
            <input type="hidden" id="employeeSelect" value={selectedEmployee || ''} readOnly />
            <p className="text-xs text-muted-foreground">Choose which employee should work on this task</p>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium">Task Details *</label>
            <Textarea
              id="taskContext"
              placeholder="Enter task details..."
              value={taskContext}
              onChange={(e) => setTaskContext(e.target.value)}
              rows={4}
            />
          </div>

          <Button 
            onClick={handleCreateTaskClick}
            className="w-full bg-rose-400 hover:bg-rose-500 text-white"
          >
            <Plus className="mr-2 h-4 w-4" /> Create Task
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
          <CardContent className="pt-6 text-center">No tasks found</CardContent>
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
