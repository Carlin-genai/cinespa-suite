import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, AlertTriangle, Users, Calendar, Bell, Plus, Shield, User } from 'lucide-react';
import StatsCard from '@/components/Dashboard/StatsCard';
import TaskCard from '@/components/Tasks/TaskCard';
import TaskCreateDialog from '@/components/Tasks/TaskCreateDialog';
import { apiService } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Task } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const { user, profile, userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const isAdmin = userRole?.role === 'admin';

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

  // Admin user IDs (for employee view, show only tasks assigned by admins)
  const { data: adminIds = [], isLoading: loadingAdmins } = useQuery({
    queryKey: ['admin-ids'],
    queryFn: async () => {
      console.log('[Dashboard] Fetching admin IDs...');
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');
      if (error) {
        console.warn('[Dashboard] Failed to fetch admin IDs', error);
        return [] as string[];
      }
      const adminIds = (data || []).map((r: any) => r.user_id as string);
      console.log('[Dashboard] Found admin IDs:', adminIds);
      return adminIds;
    },
    enabled: !isAdmin,
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: (task: Partial<Task>) => apiService.createTask(task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] }); // Refresh employee list
      toast({
        title: "Success",
        description: "Task created successfully",
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

  // Invalidate employee cache when dialog opens (to get fresh data with new RLS policies)
  React.useEffect(() => {
    if (createDialogOpen) {
      console.log('[Dashboard] Invalidating employee cache for fresh data');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.refetchQueries({ queryKey: ['employees'] });
    }
  }, [createDialogOpen, queryClient]);

  // Filter tasks based on user role
  const userTasks = React.useMemo(() => {
    console.log('[Dashboard] Filtering tasks for user role:', { isAdmin, userId: user?.id, totalTasks: tasks.length, adminIds });
    
    if (isAdmin) {
      // Admins see all tasks
      console.log('[Dashboard] Admin user - showing all tasks:', tasks.length);
      return tasks;
    } else {
      // Employees see only tasks assigned TO them BY admins
      const filteredTasks = tasks.filter((task: Task) => {
        const isAssignedToMe = task.assigned_to === user?.id;
        const isAssignedByAdmin = adminIds.length > 0 
          ? adminIds.includes(task.assigned_by as string)
          : task.assigned_by !== user?.id; // fallback: not self-assigned
        
        const shouldShow = isAssignedToMe && isAssignedByAdmin;
        
        if (isAssignedToMe) {
          console.log('[Dashboard] Task assigned to me:', {
            taskId: task.id,
            title: task.title,
            assigned_by: task.assigned_by,
            isAssignedByAdmin,
            shouldShow
          });
        }
        
        return shouldShow;
      });
      
      console.log('[Dashboard] Employee filtering result:', {
        totalTasks: tasks.length,
        filteredTasks: filteredTasks.length,
        adminIds: adminIds.length,
        userId: user?.id
      });
      
      return filteredTasks;
    }
  }, [tasks, isAdmin, user?.id, adminIds]);
  
  // Debug stats calculation
  React.useEffect(() => {
    console.log('[Dashboard] Stats calculation:', {
      userTasks: userTasks.length,
      completed: userTasks.filter(t => t.status === 'completed').length,
      pending: userTasks.filter(t => t.status === 'pending').length,
      inProgress: userTasks.filter(t => t.status === 'in-progress').length,
      overdue: userTasks.filter(t => t.status === 'overdue').length,
    });
  }, [userTasks]);
  
  // Calculate stats from user's tasks
  const completedTasks = userTasks.filter((task: Task) => task.status === 'completed').length;
  const pendingTasks = userTasks.filter((task: Task) => task.status === 'pending').length;
  const inProgressTasks = userTasks.filter((task: Task) => task.status === 'in-progress').length;
  const overdueTasks = userTasks.filter((task: Task) => task.status === 'overdue').length;

  // Get recent tasks (last 5)
  const recentTasks = userTasks
    .sort((a: Task, b: Task) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const handleCreateTask = (task: Partial<Task>) => {
    createTaskMutation.mutate({
      ...task,
      assigned_by: user?.id,
    });
  };

  if (isLoading || (loadingAdmins && !isAdmin)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-gold"></div>
        <p className="ml-4 text-muted-foreground">
          {isLoading ? 'Loading tasks...' : 'Loading admin data...'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Company Name and Add Task Button */}
      <div className="flex items-center justify-between mb-8">
        <div className="text-center flex-1">
          <h1 className="text-4xl font-bold text-rose-gold-contrast mb-2">
            Mark Technologies
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.full_name || user?.email}
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            {isAdmin ? (
              <div className="flex items-center gap-1 px-3 py-1 bg-rose-gold/10 text-rose-gold rounded-full text-sm">
                <Shield className="h-4 w-4" />
                Administrator
              </div>
            ) : (
              <div className="flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                <User className="h-4 w-4" />
                Employee
              </div>
            )}
          </div>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-rose-gold hover:bg-rose-gold-dark text-white ml-4"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        )}
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
          className="bg-gradient-to-br from-green-50 to-green-25 dark:from-green-950 dark:to-green-900"
        />
        <StatsCard
          title="In Progress"
          value={inProgressTasks}
          icon={Clock}
          className="bg-gradient-to-br from-blue-50 to-blue-25 dark:from-blue-950 dark:to-blue-900"
        />
        <StatsCard
          title="Overdue"
          value={overdueTasks}
          icon={AlertTriangle}
          trend={overdueTasks > 0 ? "down" : "neutral"}
          className="bg-gradient-to-br from-red-50 to-red-25 dark:from-red-950 dark:to-red-900"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="hover:shadow-lg hover:shadow-rose-gold/20 transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-rose-gold-contrast">
              <Calendar className="h-5 w-5 text-rose-gold" />
              Recent Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tasks found</p>
                <p className="text-sm mt-2">
                  {isAdmin 
                    ? "Create tasks to assign to team members" 
                    : "Tasks will appear here once they are assigned to you"
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentTasks.map((task: Task) => (
                  <div key={task.id} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm text-rose-gold-contrast">{task.title}</h4>
                      <span 
                        className={cn(
                          "text-xs px-2 py-1 rounded text-white",
                          task.status === 'completed' && "bg-completed-green",
                          task.status === 'in-progress' && "bg-progress-blue", 
                          task.status === 'overdue' && "bg-overdue-red",
                          task.status === 'pending' && "bg-pending-yellow text-gray-800"
                        )}
                      >
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

        <Card className="hover:shadow-lg hover:shadow-rose-gold/20 transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-rose-gold-contrast">
              <Bell className="h-5 w-5 text-rose-gold" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Completion Rate</span>
                <span className="font-semibold text-green-600">
                  {userTasks.length > 0 ? Math.round((completedTasks / userTasks.length) * 100) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Tasks</span>
                <span className="font-semibold text-blue-600">{inProgressTasks + pendingTasks}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Priority Tasks</span>
                <span className="font-semibold text-rose-gold">
                  {userTasks.filter((task: Task) => task.priority === 'high' || task.priority === 'critical').length}
                </span>
              </div>
              {overdueTasks > 0 && (
                <div className="flex items-center justify-between border-t pt-4">
                  <span className="text-sm text-red-600">Needs Attention</span>
                  <span className="font-semibold text-red-600">{overdueTasks} overdue</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <TaskCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSave={handleCreateTask}
      />
    </div>
  );
};

export default Dashboard;
