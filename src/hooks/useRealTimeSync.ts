import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useRealTimeSync = (table: string, queryKeys: string[]) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log(`[useRealTimeSync:${table}] Setting up realtime subscription for keys:`, queryKeys);
    
    const channel = supabase
      .channel(`${table}-realtime`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table 
      }, (payload) => {
        console.log(`[useRealTimeSync:${table}] Realtime update:`, payload.eventType, payload);
        
        // Invalidate all specified query keys immediately
        queryKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
        
        // For tasks table, also invalidate dashboard and team queries
        if (table === 'tasks') {
          queryClient.invalidateQueries({ queryKey: ['tasks-dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['tasks-team'] });
          queryClient.invalidateQueries({ queryKey: ['tasks-my'] });
          queryClient.invalidateQueries({ queryKey: ['tasks-assigned'] });
        }
      })
      .subscribe();

    return () => {
      console.log(`[useRealTimeSync:${table}] Cleaning up realtime subscription`);
      supabase.removeChannel(channel);
    };
  }, [table, queryKeys, queryClient]);
};

export const useTeamsRealTimeSync = () => useRealTimeSync('teams', ['teams']);
export const useUsersRealTimeSync = () => useRealTimeSync('profiles', ['users']);
export const useTasksRealTimeSync = () => useRealTimeSync('tasks', ['tasks', 'tasks-dashboard', 'tasks-team', 'tasks-my', 'tasks-assigned']);