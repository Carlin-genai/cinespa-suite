import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useGlobalTaskSync = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    console.log('[useGlobalTaskSync] Setting up global task realtime subscription');
    
    const channel = supabase
      .channel('global-tasks-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tasks' 
      }, (payload) => {
        console.log('[useGlobalTaskSync] Global realtime update:', payload.eventType);
        
        // Invalidate ALL task queries immediately for instant sync
        queryClient.invalidateQueries({ queryKey: ['tasks-dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['tasks-team'] });
        queryClient.invalidateQueries({ queryKey: ['tasks-my'] });
        queryClient.invalidateQueries({ queryKey: ['tasks-assigned'] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        
        // Also invalidate team-related queries
        queryClient.invalidateQueries({ queryKey: ['teams'] });
      })
      .subscribe();

    return () => {
      console.log('[useGlobalTaskSync] Cleaning up global realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
};