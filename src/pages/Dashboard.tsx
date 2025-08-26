
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Clock, AlertTriangle, Users, Calendar, Bell } from 'lucide-react';
import StatsCard from '@/components/Dashboard/StatsCard';
import TaskCard from '@/components/Tasks/TaskCard';
import { apiService } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Task } from '@/types';

const Dashboard = () => {
  const { user } = useAuth();

  // Fetch tasks from backend API
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => apiService.getTasks(),
  });

  // Fetch analytics from backend
  const { data: analytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => apiService.getAnalytics(),
  });

  // Filter user's own tasks
  const userTasks = tasks.filter((task: Task) => task.assigned_to === user?.id);
  
  // Calculate stats from user's tasks
  const completedTasks = userTasks.filter((task: Task) => task.status === 'completed').length;
  const pendingTasks = userTasks.filter((task: Task) => task.status === 'pending').length;
  const inProgressTasks = userTasks.filter((task: Task) => task.status === 'in-progress').length;
  const overdueTasks = userTasks.filter((task: Task) => task.status === 'overdue').length;

  // Get recent tasks (last 5)
  const recentTasks = userTasks
    .sort((a: Task, b: Task) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-luxury-gold"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Company Name */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold font-montserrat text-foreground mb-2">
          CINESPA - LUXURY HOME THEATRES AND AUTOMATIONS
        </h1>
        <p className="text-muted-foreground font-opensans">
          Welcome back, {user?.user_metadata?.full_name || user?.email}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Tasks"
          value={userTasks.length}
          icon={Calendar}
          className="bg-gradient-to-br from-background to-muted"
        />
        <StatsCard
          title="Completed"
          value={completedTasks}
          change={`${userTasks.length > 0 ? Math.round((completedTasks / userTasks.length) * 100) : 0}% completion rate`}
          icon={CheckCircle2}
          trend="up"
          className="bg-gradient-to-br from-completed-green/10 to-completed-green/5"
        />
        <StatsCard
          title="In Progress"
          value={inProgressTasks}
          icon={Clock}
          className="bg-gradient-to-br from-progress-blue/10 to-progress-blue/5"
        />
        <StatsCard
          title="Overdue"
          value={overdueTasks}
          icon={AlertTriangle}
          trend={overdueTasks > 0 ? "down" : "neutral"}
          className="bg-gradient-to-br from-blocked-red/10 to-blocked-red/5"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="hover:shadow-lg hover:shadow-luxury-gold/20 transition-all duration-300">
          <CardHeader>
            <CardTitle className="font-montserrat flex items-center gap-2">
              <Calendar className="h-5 w-5 text-luxury-gold" />
              Recent Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-opensans">No tasks assigned yet</p>
                <p className="text-sm mt-2">Tasks will appear here once they are assigned to you</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentTasks.map((task: Task) => (
                  <div key={task.id} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium font-opensans text-sm">{task.title}</h4>
                      <span className={`text-xs px-2 py-1 rounded ${
                        task.status === 'completed' ? 'bg-completed-green text-white' :
                        task.status === 'in-progress' ? 'bg-progress-blue text-white' :
                        task.status === 'overdue' ? 'bg-blocked-red text-white' :
                        'bg-not-started-beige text-charcoal-black'
                      }`}>
                        {task.status.replace('-', ' ').toUpperCase()}
                      </span>
                    </div>
                    {task.due_date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg hover:shadow-luxury-gold/20 transition-all duration-300">
          <CardHeader>
            <CardTitle className="font-montserrat flex items-center gap-2">
              <Bell className="h-5 w-5 text-luxury-gold" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-opensans text-muted-foreground">Completion Rate</span>
                <span className="font-semibold text-completed-green">
                  {userTasks.length > 0 ? Math.round((completedTasks / userTasks.length) * 100) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-opensans text-muted-foreground">Active Tasks</span>
                <span className="font-semibold text-progress-blue">{inProgressTasks + pendingTasks}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-opensans text-muted-foreground">Priority Tasks</span>
                <span className="font-semibold text-high-priority">
                  {userTasks.filter((task: Task) => task.priority === 'high' || task.priority === 'critical').length}
                </span>
              </div>
              {overdueTasks > 0 && (
                <div className="flex items-center justify-between border-t pt-4">
                  <span className="text-sm font-opensans text-blocked-red">Needs Attention</span>
                  <span className="font-semibold text-blocked-red">{overdueTasks} overdue</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
