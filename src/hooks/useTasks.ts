import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Task } from '@/types';

export type TaskKind = 'dashboard' | 'my' | 'team' | 'self' | 'assigned';

interface TaskParams {
  teamId?: string;
  limit?: number;
  status?: string;
}

export const useTasks = (kind: TaskKind, params: TaskParams = {}) => {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<Error | null>(null);

  // Build query based on kind
  const buildQuery = () => {
    let query = supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    // Add pagination
    const limit = params.limit || 50;
    query = query.range(0, limit - 1);

    // Add filters based on kind
    switch (kind) {
      case 'my':
        if (!user?.id) throw new Error('User not authenticated');
        query = query.eq('assigned_to', user.id);
        break;
      
      case 'self':
        if (!user?.id) throw new Error('User not authenticated');
        query = query.eq('assigned_to', user.id).eq('assigned_by', user.id);
        break;
      
      case 'assigned':
        if (userRole?.role !== 'admin') throw new Error('Admin access required');
        if (!user?.id) throw new Error('User not authenticated');
        query = query.eq('assigned_by', user.id);
        break;
      
      case 'team':
        if (params.teamId) {
          query = query.eq('team_id', params.teamId);
        }
        break;
      
      case 'dashboard':
      default:
        // Dashboard shows all accessible tasks (handled by RLS)
        break;
    }

    // Add status filter if provided
    if (params.status && params.status !== 'all') {
      query = query.eq('status', params.status);
    }

    return query;
  };

  // React Query setup
  const {
    data: tasks = [],
    isLoading,
    error: queryError,
    refetch
  } = useQuery({
    queryKey: [`tasks-${kind}`, kind, params, user?.id],
    queryFn: async (): Promise<Task[]> => {
      try {
        console.log(`[useTasks:${kind}] Fetching tasks...`, { params, userId: user?.id });
        setError(null);

        const query = buildQuery();
        const { data, error } = await query;

        if (error) {
          console.error(`[useTasks:${kind}] Database error:`, error);
          throw new Error(`Failed to fetch ${kind} tasks: ${error.message}`);
        }

        console.log(`[useTasks:${kind}] Successfully fetched ${data?.length || 0} tasks`);
        return (data || []) as Task[];
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : `Failed to fetch ${kind} tasks`;
        console.error(`[useTasks:${kind}] Error:`, errorMessage);
        setError(err as Error);
        throw err;
      }
    },
    enabled: !!user && (kind !== 'assigned' || userRole?.role === 'admin'),
    retry: 2,
    staleTime: 1000 * 60 * 2, // 2 minutes for better caching
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
  });

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    console.log(`[useTasks:${kind}] Setting up realtime subscription`);
    
    const channel = supabase
      .channel(`tasks-${kind}-realtime`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tasks' 
      }, (payload) => {
        console.log(`[useTasks:${kind}] Realtime update:`, payload.eventType);
        queryClient.invalidateQueries({ queryKey: [`tasks-${kind}`] });
      })
      .subscribe();

    return () => {
      console.log(`[useTasks:${kind}] Cleaning up realtime subscription`);
      supabase.removeChannel(channel);
    };
  }, [kind, user, queryClient]);

  // Retry function
  const reload = () => {
    setError(null);
    refetch();
  };

  // Combined error state
  const finalError = error || queryError;

  return {
    data: tasks,
    error: finalError,
    loading: isLoading,
    reload
  };
};