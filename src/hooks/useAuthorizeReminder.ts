import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAuthorizeReminder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (reminderId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('payment_reminders')
        .update({
          reminder_status: 'pending_payment',
          authorized_by: user.id,
          authorized_at: new Date().toISOString()
        })
        .eq('id', reminderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-reminders'] });
      toast({
        title: "Success",
        description: "Payment reminder has been authorized",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUploadProof = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ reminderId, file, authRequired }: { 
      reminderId: string; 
      file: File; 
      authRequired: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${reminderId}-${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('task-attachments')
        .getPublicUrl(fileName);

      // Update reminder with proof URL and status
      const newStatus = authRequired ? 'pending_authorization' : 'completed';
      
      const { data, error } = await supabase
        .from('payment_reminders')
        .update({
          payment_proof_url: publicUrl,
          reminder_status: newStatus
        })
        .eq('id', reminderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { authRequired }) => {
      queryClient.invalidateQueries({ queryKey: ['payment-reminders'] });
      toast({
        title: "Success",
        description: authRequired 
          ? "Payment proof uploaded. Awaiting authorization."
          : "Payment proof uploaded and reminder completed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};