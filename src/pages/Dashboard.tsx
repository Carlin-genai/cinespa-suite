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
import AuthGuard from '@/components/AuthGuard';

const Dashboard = () => {
  const { user, profile, userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const isAdmin = userRole?.role === 'admin';

  // Fetch tasks from backend API
  const { data: tasks = [], isLoading, error, refetch } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      console.log('[Dashboard] Fetching tasks...');
      const result = await apiService.getTasks();
      console.log('[Dashboard] Tasks fetched:', result.length);
      return result;
    },
    enabled: !!user, // Only fetch when user is authenticated
    retry: 1,
  });

  // Fetch analytics from backend
  const { data: analytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => apiService.getAnalytics(),
  });


  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (task: Partial<Task> & { attachments?: File[] }) => {
      console.log('[Dashboard] Creating task:', task);
      return await apiService.createTask(task);
    },
    onSuccess: (data) => {
      console.log('[Dashboard] Task created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] }); // Refresh employee list
      // Force immediate refetch
      refetch();
      setCreateDialogOpen(false);
    },
    onError: (error) => {
      console.error('[Dashboard] Create task error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create task",
        variant: "destructive",
      });
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

  // Realtime: refresh tasks immediately when new tasks are inserted/updated/deleted
  React.useEffect(() => {
    if (!user) return;
    
    console.log('[Dashboard] Setting up realtime listener for user:', user.id);
    
    const channel = supabase
      .channel('public:tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        console.log('[Dashboard] Realtime change on tasks:', payload.eventType);
        // Refetch tasks so the dashboard updates instantly for both admin and employee
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        refetch();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, refetch, user]);

  // Filter tasks based on user role
  const userTasks = React.useMemo(() => {
    if (isAdmin) {
      // Admins see all tasks assigned by them
      return tasks.filter((task: Task) => task.assigned_by === user?.id);
    } else {
      // Employees see all tasks assigned TO them (including team tasks)
      return tasks.filter((task: Task) => task.assigned_to === user?.id);
    }
  }, [tasks, isAdmin, user?.id]);
  
  
  // Calculate stats from user's tasks
  const completedTasks = userTasks.filter((task: Task) => task.status === 'completed').length;
  const pendingTasks = userTasks.filter((task: Task) => task.status === 'pending').length;
  const inProgressTasks = userTasks.filter((task: Task) => task.status === 'in-progress').length;
  const overdueTasks = userTasks.filter((task: Task) => task.status === 'overdue').length;

  // Get recent tasks (last 5)
  const recentTasks = userTasks
    .sort((a: Task, b: Task) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const handleCreateTask = (task: Partial<Task> & { attachments?: File[] }) => {
    console.log('[Dashboard] handleCreateTask called with:', task);
    
    if (!user?.id) {
      console.error('[Dashboard] No user ID available for task creation');
      toast({
        title: "Error", 
        description: "You must be logged in to create tasks",
        variant: "destructive",
      });
      return;
    }
    
    // Ensure default values for required fields
    const taskData = {
      title: task.title?.trim() || '',
      description: task.description?.trim() || '',
      status: task.status || 'pending' as const,
      priority: task.priority || 'medium' as const,
      assigned_by: user.id,
      assigned_to: task.assigned_to || user.id,
      due_date: task.due_date || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      notes: task.notes || undefined,
      time_limit: (task as any).time_limit || undefined,
      credit_points: (task as any).credit_points || 0,
      attachment_url: (task as any).attachment_url || undefined,
      attachments: task.attachments || undefined,
      assignedEmployees: (task as any).assignedEmployees || undefined,
    };
    
    console.log('[Dashboard] Final task data for creation:', taskData);
    createTaskMutation.mutate(taskData);
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="ml-4 text-muted-foreground">
          {!user ? 'Please log in to access the dashboard' : 'Loading tasks...'}
        </p>
      </div>
    );
  }

  if (error) {
    console.error('[Dashboard] Error loading tasks:', error);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-destructive mb-4">Error loading tasks</p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  return (
    <AuthGuard requireAuth={true}>
      <div className="space-y-6">
        {/* Header with Company Name and Add Task Button */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-rose-gold-contrast mb-2">
              Wedot
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
                <div className="flex items-center gap-1 px-3 py-1 bg-progress-blue/15 text-progress-blue rounded-full text-sm border border-progress-blue/30">
                  <User className="h-4 w-4" />
                  Employee
                </div>
              )}
            </div>
          </div>
          {isAdmin && (
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="bg-rose-gold hover:bg-rose-gold-dark text-rose-gold-foreground ml-4"
              disabled={createTaskMutation.isPending}
            >
              <Plus className="mr-2 h-4 w-4" />
              {createTaskMutation.isPending ? 'Creating...' : 'Add Task'}
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
          className="bg-gradient-to-br from-completed-green/10 to-completed-green/5 dark:from-completed-green/15 dark:to-completed-green/10"
        />
        <StatsCard
          title="In Progress"
          value={inProgressTasks}
          icon={Clock}
          className="bg-gradient-to-br from-progress-blue/10 to-progress-blue/5 dark:from-progress-blue/15 dark:to-progress-blue/10"
        />
        <StatsCard
          title="Overdue"
          value={overdueTasks}
          icon={AlertTriangle}
          trend={overdueTasks > 0 ? "down" : "neutral"}
          className="bg-gradient-to-br from-overdue-red/10 to-overdue-red/5 dark:from-overdue-red/15 dark:to-overdue-red/10"
        />
      </div>

      {/* Admin Tasks Management Section (Admin Only) */}
      {isAdmin && (
        <Card className="hover:shadow-lg hover:shadow-rose-gold/20 transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-rose-gold-contrast">
              <Shield className="h-5 w-5 text-rose-gold" />
              Tasks Assigned by Me
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tasks assigned yet</p>
                <p className="text-sm mt-2">Create tasks to assign to team members</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {tasks
                  .filter((task: Task) => task.assigned_by === user?.id)
                  .sort((a: Task, b: Task) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((task: Task) => (
                    <div key={task.id} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm text-rose-gold-contrast">{task.title}</h4>
                        <span 
                          className={cn(
                            "text-xs px-2 py-1 rounded text-on-color font-medium",
                            task.status === 'completed' && "bg-completed-green",
                            task.status === 'in-progress' && "bg-progress-blue", 
                            task.status === 'overdue' && "bg-overdue-red",
                            task.status === 'pending' && "bg-pending-yellow text-foreground"
                          )}
                        >
                          {task.status.replace('-', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Assigned to: {task.assigned_to === user?.id ? 'Self' : 'Team Member'}</span>
                        {task.due_date && (
                          <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className={cn("grid gap-6", isAdmin ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 lg:grid-cols-2")}>
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
                          "text-xs px-2 py-1 rounded text-on-color font-medium",
                          task.status === 'completed' && "bg-completed-green",
                          task.status === 'in-progress' && "bg-progress-blue", 
                          task.status === 'overdue' && "bg-overdue-red",
                          task.status === 'pending' && "bg-pending-yellow text-foreground"
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
                <span className="font-semibold text-completed-green">
                  {userTasks.length > 0 ? Math.round((completedTasks / userTasks.length) * 100) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Tasks</span>
                <span className="font-semibold text-progress-blue">{inProgressTasks + pendingTasks}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Priority Tasks</span>
                <span className="font-semibold text-rose-gold">
                  {userTasks.filter((task: Task) => task.priority === 'high' || task.priority === 'critical').length}
                </span>
              </div>
              {overdueTasks > 0 && (
                <div className="flex items-center justify-between border-t pt-4">
                  <span className="text-sm text-overdue-red">Needs Attention</span>
                  <span className="font-semibold text-overdue-red">{overdueTasks} overdue</span>
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
        isPersonalTask={!isAdmin}
        showEmployeeSelection={isAdmin}
      />
      </div>
    </AuthGuard>
  );
};

export default Dashboard;
