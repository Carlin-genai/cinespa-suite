import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Task } from '@/types';

const NotificationManager: React.FC = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch tasks to check for completions and due dates
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => apiService.getTasks(),
    refetchInterval: 30000, // Check every 30 seconds
  });

  const isAdmin = userRole?.role === 'admin';

  // Create notification mutation
  const createNotificationMutation = useMutation({
    mutationFn: (notification: {
      user_id: string;
      title: string;
      message: string;
      type: string;
      task_id?: string;
    }) => apiService.createNotification(notification),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Check for task completions (for admin notifications)
  useEffect(() => {
    if (!isAdmin || !tasks.length) return;

    const recentlyCompleted = tasks.filter((task: Task) => {
      if (task.status !== 'completed' || !task.completed_at) return false;
      
      const completedAt = new Date(task.completed_at);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      return completedAt > fiveMinutesAgo;
    });

    recentlyCompleted.forEach((task: Task) => {
      if (task.assigned_by === user?.id) {
        createNotificationMutation.mutate({
          user_id: user.id,
          title: 'Task Completed',
          message: `Task "${task.title}" has been completed by the assigned employee.`,
          type: 'task_completed',
          task_id: task.id,
        });

        toast({
          title: "Task Completed",
          description: `"${task.title}" has been completed`,
        });
      }
    });
  }, [tasks, isAdmin, user?.id]);

  // Check for overdue tasks
  useEffect(() => {
    if (!tasks.length) return;

    const now = new Date();
    const overdueTasks = tasks.filter((task: Task) => {
      if (task.status === 'completed' || !task.due_date) return false;
      
      const dueDate = new Date(task.due_date);
      return dueDate < now && task.status !== 'overdue';
    });

    overdueTasks.forEach((task: Task) => {
      // Notify the employee
      if (task.assigned_to === user?.id) {
        createNotificationMutation.mutate({
          user_id: task.assigned_to,
          title: 'Task Overdue',
          message: `Task "${task.title}" is now overdue. Please complete it as soon as possible.`,
          type: 'task_overdue',
          task_id: task.id,
        });
      }

      // Notify the admin if they assigned it
      if (isAdmin && task.assigned_by === user?.id && task.assigned_to !== user?.id) {
        createNotificationMutation.mutate({
          user_id: user.id,
          title: 'Task Overdue',
          message: `Task "${task.title}" assigned to an employee is now overdue.`,
          type: 'task_overdue',
          task_id: task.id,
        });
      }
    });
  }, [tasks, user?.id, isAdmin]);

  // Check for tasks due soon (next 24 hours)
  useEffect(() => {
    if (!tasks.length) return;

    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    const dueSoonTasks = tasks.filter((task: Task) => {
      if (task.status === 'completed' || !task.due_date) return false;
      
      const dueDate = new Date(task.due_date);
      return dueDate > now && dueDate <= next24Hours;
    });

    dueSoonTasks.forEach((task: Task) => {
      // Notify the employee
      if (task.assigned_to === user?.id) {
        createNotificationMutation.mutate({
          user_id: task.assigned_to,
          title: 'Task Due Soon',
          message: `Task "${task.title}" is due within the next 24 hours.`,
          type: 'task_due_soon',
          task_id: task.id,
        });
      }
    });
  }, [tasks, user?.id]);

  // Check for newly assigned tasks
  useEffect(() => {
    if (!tasks.length) return;

    const recentlyAssigned = tasks.filter((task: Task) => {
      if (task.assigned_to !== user?.id) return false;
      
      const createdAt = new Date(task.created_at);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      return createdAt > fiveMinutesAgo;
    });

    recentlyAssigned.forEach((task: Task) => {
      createNotificationMutation.mutate({
        user_id: user?.id || '',
        title: 'New Task Assigned',
        message: `You have been assigned a new task: "${task.title}". Priority: ${task.priority.toUpperCase()}`,
        type: 'task_assigned',
        task_id: task.id,
      });

      toast({
        title: "New Task Assigned",
        description: `"${task.title}" has been assigned to you`,
      });
    });
  }, [tasks, user?.id]);

  return null; // This component doesn't render anything
};

export default NotificationManager;