import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUnifiedTaskSync = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    console.log('[useUnifiedTaskSync] Setting up unified real-time subscription');
    
    const channel = supabase
      .channel('unified-tasks-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tasks' 
      }, (payload) => {
        console.log('[useUnifiedTaskSync] Real-time update:', payload.eventType);
        
        // Invalidate ALL task-related queries immediately
        const taskQueryKeys = [
          'tasks-dashboard',
          'tasks-team', 
          'tasks-my',
          'tasks-assigned',
          'tasks-self',
          'tasks'
        ];
        
        taskQueryKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
        
        // Also invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['teams'] });
        queryClient.invalidateQueries({ queryKey: ['analytics'] });
      })
      .subscribe();

    return () => {
      console.log('[useUnifiedTaskSync] Cleaning up unified realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
};