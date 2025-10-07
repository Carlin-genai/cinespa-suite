import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, Clock, AlertTriangle, Users, Calendar, Bell, Plus, Shield, User, RefreshCw, Star, Award } from 'lucide-react';
import StatsCard from '@/components/Dashboard/StatsCard';
import TaskCard from '@/components/Tasks/TaskCard';
import TaskCreateDialog from '@/components/Tasks/TaskCreateDialog';
import TaskStatusPopup from '@/components/Dashboard/TaskStatusPopup';
import AdminTaskDetailsDialog from '@/components/Dashboard/AdminTaskDetailsDialog';
import CreditPointsTab from '@/components/Dashboard/CreditPointsTab';
import { apiService } from '@/lib/api';
import { supabaseApi } from '@/lib/supabaseApi';
import { useAuth } from '@/contexts/AuthContext';
import { Task } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import AuthGuard from '@/components/AuthGuard';
import { useTasks } from '@/hooks/useTasks';
import { useUnifiedTaskSync } from '@/hooks/useUnifiedTaskSync';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const { user, profile, userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [taskStatusPopupOpen, setTaskStatusPopupOpen] = useState(false);
  const [taskStatusType, setTaskStatusType] = useState<string>('');
  const [taskStatusTitle, setTaskStatusTitle] = useState<string>('');
  const [adminTaskDetailsOpen, setAdminTaskDetailsOpen] = useState(false);
  const [selectedAdminTask, setSelectedAdminTask] = useState<Task | null>(null);

  const isAdmin = userRole?.role === 'admin';

  // Unified real-time sync for tasks
  useUnifiedTaskSync();

  // Use the new useTasks hook
  const { data: tasks = [], loading, error, reload } = useTasks('dashboard');

  // Fetch team information for displaying team names
  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  // Fetch analytics from backend
  const { data: analytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => apiService.getAnalytics(),
  });


  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      console.log('[Dashboard] Creating task - Admin check:', {
        isAdmin,
        userRole: userRole?.role,
        taskData
      });
      
      const response = await supabaseApi.createTask(taskData);
      return response;
    },
    onSuccess: (data) => {
      console.log('[Dashboard] Task created successfully:', data);
      
      setCreateDialogOpen(false);
      
      // Immediately invalidate ALL task queries for instant sync across dashboards
      queryClient.invalidateQueries({ queryKey: ['tasks-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-team'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-my'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-assigned'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-self'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      
      // Force immediate refetch to show tasks instantly
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['tasks-dashboard'] });
        queryClient.refetchQueries({ queryKey: ['tasks'] });
        reload(); // Also trigger manual reload
      }, 50); // Reduced timeout for faster updates
      
      // Handle both single task and array of tasks
      const taskTitle = Array.isArray(data) ? 
        `${data.length} tasks` : 
        `Task "${data.title}"`;
      
      toast({
        title: "Task Created",
        description: `${taskTitle} created successfully and appearing in all dashboards now.`,
        variant: "default",
      });
    },
    onError: (error) => {
      console.error('[Dashboard] Create task error:', error);
      toast({
        title: "Task Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create task. Please check your permissions and try again.",
        variant: "destructive",
      });
    },
  });

  // Invalidate employee cache when dialog opens (to get fresh data with new RLS policies)
  useEffect(() => {
    if (createDialogOpen) {
      console.log('[Dashboard] Invalidating employee cache for fresh data');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.refetchQueries({ queryKey: ['employees'] });
    }
  }, [createDialogOpen, queryClient]);

  // Realtime: refresh tasks immediately when new tasks are inserted/updated/deleted (handled by useTasks hook)

  // Filter tasks based on user role
  const userTasks = useMemo(() => {
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
  
  // Calculate total credit points for the user
  const totalCreditPoints = useMemo(() => {
    return userTasks.reduce((sum: number, task: Task) => sum + (task.credit_points || 0), 0);
  }, [userTasks]);

  const handleCreateTask = async (task: Partial<Task> & { attachments?: File[] }) => {
    console.log('[Dashboard] handleCreateTask called with:', task);
    
    if (!user?.id) {
      console.error('[Dashboard] No user ID available for task creation');
      toast({
        title: "Authentication Error", 
        description: "You must be logged in to create tasks",
        variant: "destructive",
      });
      return;
    }
    
    // Ensure default values for required fields with safe fallbacks
    const taskData = {
      title: task.title?.trim() || '',
      description: task.description?.trim() || '',
      status: task.status || 'pending' as const,
      priority: task.priority || 'medium' as const,
      assigned_by: user.id,
      assigned_to: task.assigned_to || user.id,
      due_date: task.due_date || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      notes: task.notes || null,
      time_limit: (task as any).time_limit || null,
      credit_points: (task as any).credit_points || 0,
      attachment_url: (task as any).attachment_url || null,
      attachments: task.attachments || undefined,
      assignedEmployees: (task as any).assignedEmployees || undefined,
    };
    
    console.log('[Dashboard] Final task data for creation:', taskData);
    
    try {
      await createTaskMutation.mutateAsync(taskData);
      setCreateDialogOpen(false);
    } catch (error) {
      console.error('[Dashboard] Task creation failed:', error);
      // Error handling is already done in the mutation's onError
    }
  };

  // Handle stat card clicks to open popup
  const handleStatCardClick = (status: string, title: string) => {
    setTaskStatusType(status);
    setTaskStatusTitle(title);
    setTaskStatusPopupOpen(true);
  };

  // Handle admin task click
  const handleAdminTaskClick = (task: Task) => {
    setSelectedAdminTask(task);
    setAdminTaskDetailsOpen(true);
  };

  // Handle task updates from popups
  const handleTaskUpdate = async (updatedTask: Task) => {
    try {
      await apiService.updateTask(updatedTask.id, updatedTask);
      queryClient.invalidateQueries({ queryKey: ['tasks-dashboard'] });
      reload();
      toast({
        title: "Task Updated",
        description: "Task updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  // Handle task deletion
  const handleTaskDelete = async (taskId: string) => {
    try {
      await apiService.deleteTask(taskId);
      queryClient.invalidateQueries({ queryKey: ['tasks-dashboard'] });
      reload();
      toast({
        title: "Task Deleted",
        description: "Task deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  // Get team name for task
  const getTeamNameForTask = (task: Task) => {
    if (task.team_id) {
      const team = teams.find(t => t.id === task.team_id);
      return team ? `Team: ${team.name}` : 'Team Task';
    }
    return task.assigned_to === user?.id ? 'Self' : 'Individual';
  };

  if (loading || !user) {
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
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-destructive mb-4">Failed to load dashboard</p>
        <p className="text-muted-foreground mb-4 text-sm">{error.message}</p>
        <Button onClick={reload} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
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
            <div className="flex items-center justify-center gap-3 mt-2">
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
              {!isAdmin && (
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                  totalCreditPoints > 0 ? 'bg-completed-green/15 text-completed-green border border-completed-green/30' :
                  totalCreditPoints < 0 ? 'bg-overdue-red/15 text-overdue-red border border-overdue-red/30' :
                  'bg-muted text-muted-foreground'
                }`}>
                  <Award className="h-4 w-4" />
                  {totalCreditPoints > 0 ? '+' : ''}{totalCreditPoints} Credit Points
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

      {/* Stats Grid - Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div onClick={() => handleStatCardClick('all', 'All Tasks')} className="cursor-pointer">
          <StatsCard
            title="Total Tasks"
            value={userTasks.length}
            icon={Calendar}
            className="bg-gradient-to-br from-background to-muted hover:shadow-lg transition-shadow"
          />
        </div>
        <div onClick={() => handleStatCardClick('completed', 'Completed Tasks')} className="cursor-pointer">
          <StatsCard
            title="Completed"
            value={completedTasks}
            change={`${userTasks.length > 0 ? Math.round((completedTasks / userTasks.length) * 100) : 0}% completion rate`}
            icon={CheckCircle2}
            trend="up"
            className="bg-gradient-to-br from-completed-green/10 to-completed-green/5 dark:from-completed-green/15 dark:to-completed-green/10 hover:shadow-lg transition-shadow"
          />
        </div>
        <div onClick={() => handleStatCardClick('in-progress', 'In Progress Tasks')} className="cursor-pointer">
          <StatsCard
            title="In Progress"
            value={inProgressTasks}
            icon={Clock}
            className="bg-gradient-to-br from-progress-blue/10 to-progress-blue/5 dark:from-progress-blue/15 dark:to-progress-blue/10 hover:shadow-lg transition-shadow"
          />
        </div>
        <div onClick={() => handleStatCardClick('overdue', 'Overdue Tasks')} className="cursor-pointer">
          <StatsCard
            title="Overdue"
            value={overdueTasks}
            icon={AlertTriangle}
            trend={overdueTasks > 0 ? "down" : "neutral"}
            className="bg-gradient-to-br from-overdue-red/10 to-overdue-red/5 dark:from-overdue-red/15 dark:to-overdue-red/10 hover:shadow-lg transition-shadow"
          />
        </div>
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
                    <div 
                      key={task.id} 
                      className="border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => handleAdminTaskClick(task)}
                    >
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
                        <span>Assigned to: {getTeamNameForTask(task)}</span>
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

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="credits" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Credit Points
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Task overview and analytics will be displayed here</p>
            <p className="text-sm mt-2">
              Click on the stats cards above to view detailed task lists
            </p>
          </div>
        </TabsContent>

        <TabsContent value="credits">
          <CreditPointsTab tasks={userTasks} />
        </TabsContent>
      </Tabs>

      {/* Dialogs and Popups */}
      <TaskCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSave={handleCreateTask}
        isPersonalTask={!isAdmin}
        showEmployeeSelection={isAdmin}
      />

      <TaskStatusPopup
        isOpen={taskStatusPopupOpen}
        onClose={() => setTaskStatusPopupOpen(false)}
        tasks={userTasks}
        status={taskStatusType}
        title={taskStatusTitle}
        onEditTask={() => {}}
        onDeleteTask={handleTaskDelete}
        onUpdateTask={handleTaskUpdate}
      />

      <AdminTaskDetailsDialog
        task={selectedAdminTask}
        isOpen={adminTaskDetailsOpen}
        onClose={() => setAdminTaskDetailsOpen(false)}
        onSave={handleTaskUpdate}
      />
      </div>
    </AuthGuard>
  );
};

export default Dashboard;
