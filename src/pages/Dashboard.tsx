
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StatsCard from '@/components/Dashboard/StatsCard';
import { supabaseApi } from '@/lib/supabaseApi';
import { CheckSquare, Clock, AlertCircle, Users, Calendar, TrendingUp } from 'lucide-react';

const Dashboard = () => {
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['dashboard-tasks'],
    queryFn: supabaseApi.getTasks,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['dashboard-notifications'],
    queryFn: supabaseApi.getNotifications,
  });

  const pendingTasks = tasks.filter(task => task.status === 'pending').length;
  const inProgressTasks = tasks.filter(task => task.status === 'in-progress').length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const overdueTasks = tasks.filter(task => {
    if (!task.due_date) return false;
    return new Date(task.due_date) < new Date() && task.status !== 'completed';
  }).length;

  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-luxury-gold"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-montserrat text-foreground">
          CINESPA - LUXURY HOME THEATRES AND AUTOMATIONS
        </h1>
        <p className="text-muted-foreground font-opensans">
          Your comprehensive task management dashboard
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Tasks"
          value={totalTasks}
          icon={CheckSquare}
          trend="neutral"
        />
        <StatsCard
          title="In Progress"
          value={inProgressTasks}
          icon={Clock}
          trend="up"
        />
        <StatsCard
          title="Completed"
          value={completedTasks}
          icon={CheckSquare}
          trend="up"
        />
        <StatsCard
          title="Overdue"
          value={overdueTasks}
          icon={AlertCircle}
          trend={overdueTasks > 0 ? "down" : "neutral"}
        />
      </div>

      {/* Recent Tasks & Notifications */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-montserrat">
              <CheckSquare className="h-5 w-5 text-luxury-gold" />
              Recent Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{task.title}</h4>
                    <p className="text-xs text-muted-foreground">{task.description}</p>
                    {task.due_date && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" />
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Badge 
                      variant={
                        task.status === 'completed' ? 'default' :
                        task.status === 'in-progress' ? 'secondary' :
                        task.status === 'overdue' ? 'destructive' : 'outline'
                      }
                    >
                      {task.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {task.priority}
                    </Badge>
                  </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No tasks assigned yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-montserrat">
              <AlertCircle className="h-5 w-5 text-luxury-gold" />
              Recent Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.slice(0, 5).map((notification) => (
                <div key={notification.id} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{notification.title}</h4>
                      <p className="text-xs text-muted-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notification.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-luxury-gold rounded-full"></div>
                    )}
                  </div>
                </div>
              ))}
              {notifications.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No notifications yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-montserrat">
            <TrendingUp className="h-5 w-5 text-luxury-gold" />
            Progress Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Completion Rate</span>
              <span className="text-sm text-muted-foreground">{completionRate}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-luxury-gold h-2 rounded-full transition-all duration-300" 
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="font-medium text-blue-600">{pendingTasks}</div>
                <div className="text-muted-foreground">Pending</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-yellow-600">{inProgressTasks}</div>
                <div className="text-muted-foreground">In Progress</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-green-600">{completedTasks}</div>
                <div className="text-muted-foreground">Completed</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-red-600">{overdueTasks}</div>
                <div className="text-muted-foreground">Overdue</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
