
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatsCard from '@/components/Dashboard/StatsCard';
import TaskCard from '@/components/Tasks/TaskCard';
import { Button } from '@/components/ui/button';
import {
  CheckSquare,
  Clock,
  Users,
  TrendingUp,
  Plus,
  Calendar,
  Bell
} from 'lucide-react';
import { supabaseApi } from '@/lib/supabaseApi';
import { useQuery } from '@tanstack/react-query';
import { Task } from '@/types';

const Dashboard = () => {
  const [tasks, setTasks] = useState<Task[]>([]);

  // Fetch tasks data with proper error handling
  const { data: tasksData, isLoading: tasksLoading, error } = useQuery<Task[]>({
    queryKey: ['user-tasks'],
    queryFn: supabaseApi.getTasks,
  });

  useEffect(() => {
    if (tasksData && Array.isArray(tasksData)) {
      setTasks(tasksData);
    } else if (error) {
      console.log('Error fetching tasks:', error);
      setTasks([]);
    }
  }, [tasksData, error]);

  const stats = [
    { 
      title: 'Total Tasks', 
      value: tasks.length, 
      change: `${tasks.length} assigned to you`, 
      icon: CheckSquare, 
      trend: 'up' as const 
    },
    { 
      title: 'In Progress', 
      value: tasks.filter(t => t.status === 'in-progress').length, 
      change: 'Active tasks', 
      icon: Clock, 
      trend: 'up' as const 
    },
    { 
      title: 'Completed', 
      value: tasks.filter(t => t.status === 'completed').length, 
      change: 'Tasks finished', 
      icon: CheckSquare, 
      trend: 'up' as const 
    },
    { 
      title: 'Pending', 
      value: tasks.filter(t => t.status === 'pending').length, 
      change: 'Awaiting start', 
      icon: Clock, 
      trend: 'neutral' as const 
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-montserrat text-foreground">
            CINESPA - LUXURY HOME THEATRES AND AUTOMATIONS
          </h1>
          <p className="text-muted-foreground font-opensans mt-1">
            Welcome back! Here's what's happening with your projects today.
          </p>
        </div>
        <div className="flex gap-3">
          <Button size="sm" variant="outline" className="border-luxury-gold text-luxury-gold hover:bg-luxury-gold hover:text-charcoal-black">
            <Calendar className="mr-2 h-4 w-4" />
            Calendar
          </Button>
          <Button size="sm" variant="outline" className="border-luxury-gold text-luxury-gold hover:bg-luxury-gold hover:text-charcoal-black">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </Button>
          <Button size="sm" className="gradient-gold text-charcoal-black hover:opacity-90">
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Recent Tasks */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-montserrat text-foreground">
                Recent Tasks
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-luxury-gold hover:bg-luxury-gold hover:text-charcoal-black"
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tasks.slice(0, 6).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={(task) => console.log('Edit task:', task)}
                  onDelete={(taskId) => console.log('Delete task:', taskId)}
                />
              ))}
            </div>
            {tasks.length === 0 && !tasksLoading && (
              <div className="text-center py-8 text-muted-foreground">
                <CheckSquare className="mx-auto h-12 w-12 mb-4 text-luxury-gold" />
                <p className="font-opensans">No tasks assigned yet. Tasks will appear here when assigned to you!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-montserrat text-foreground">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2 border-luxury-gold text-luxury-gold hover:bg-luxury-gold hover:text-charcoal-black"
            >
              <Plus className="h-6 w-6" />
              Create Task
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2 border-luxury-gold text-luxury-gold hover:bg-luxury-gold hover:text-charcoal-black"
            >
              <Users className="h-6 w-6" />
              Manage Team
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2 border-luxury-gold text-luxury-gold hover:bg-luxury-gold hover:text-charcoal-black"
            >
              <TrendingUp className="h-6 w-6" />
              View Analytics
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2 border-luxury-gold text-luxury-gold hover:bg-luxury-gold hover:text-charcoal-black"
            >
              <Calendar className="h-6 w-6" />
              Schedule Review
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
