import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePaymentReminderRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('[usePaymentReminderRealtime] Setting up realtime subscription');
    
    const channel = supabase
      .channel('payment-reminders-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'payment_reminders'
      }, (payload) => {
        console.log('[usePaymentReminderRealtime] Realtime update:', payload.eventType, payload);
        
        // Invalidate payment reminders queries
        queryClient.invalidateQueries({ queryKey: ['payment-reminders'] });
      })
      .subscribe();

    return () => {
      console.log('[usePaymentReminderRealtime] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};