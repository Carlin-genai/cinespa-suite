
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TaskCard from '@/components/Tasks/TaskCard';
import { Plus, Search, Filter } from 'lucide-react';
import { apiService } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

const MyTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Fetch tasks data
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: apiService.getTasks,
    onError: (error) => {
      console.log('Using mock data due to API error:', error);
      // Fallback to mock data
      setTasks([
        {
          id: '1',
          title: 'Install Premium Sound System',
          description: 'Configure and install 7.2 surround sound system with Dolby Atmos support for the main theatre room.',
          status: 'in-progress',
          priority: 'high',
          assignee: 'John Smith',
          dueDate: '2024-01-30',
          progress: 65,
          comments: 3
        },
        {
          id: '2',
          title: 'Setup Lighting Automation',
          description: 'Program smart lighting system with scene presets for different viewing experiences.',
          status: 'not-started',
          priority: 'medium',
          assignee: 'Sarah Johnson',
          dueDate: '2024-02-05',
          progress: 0,
          comments: 1
        },
        {
          id: '3',
          title: 'Calibrate Projector Display',
          description: 'Fine-tune 4K laser projector for optimal color accuracy and brightness.',
          status: 'blocked',
          priority: 'critical',
          assignee: 'Mike Davis',
          dueDate: '2024-01-25',
          progress: 30,
          comments: 5
        },
        {
          id: '4',
          title: 'Configure Network Infrastructure',
          description: 'Setup dedicated network for streaming devices and smart home integration.',
          status: 'completed',
          priority: 'high',
          assignee: 'John Smith',
          dueDate: '2024-01-20',
          progress: 100,
          comments: 2
        }
      ]);
    }
  });

  useEffect(() => {
    if (tasksData && tasksData.length > 0) {
      setTasks(tasksData);
    }
  }, [tasksData]);

  // Filter tasks based on search and filters
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleStatusChange = (taskId: string, newStatus: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    ));
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-montserrat text-foreground">
            My Tasks
          </h1>
          <p className="text-muted-foreground font-opensans mt-1">
            Manage your assigned tasks and track your progress.
          </p>
        </div>
        <Button className="gradient-gold text-charcoal-black hover:opacity-90">
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Filters */}
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
                <SelectItem value="not-started">Not Started</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
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

      {/* Tasks Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={(task) => console.log('Edit task:', task)}
            onDelete={handleDeleteTask}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>

      {filteredTasks.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-muted-foreground">
              <Plus className="mx-auto h-12 w-12 mb-4 text-luxury-gold" />
              <p className="font-opensans text-lg mb-2">No tasks found</p>
              <p className="text-sm">Try adjusting your filters or create a new task to get started.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MyTasks;
