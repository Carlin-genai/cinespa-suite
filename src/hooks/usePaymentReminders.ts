import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PaymentReminder, CreatePaymentReminderRequest, UpdatePaymentReminderRequest } from '@/types/paymentReminder';
import { useToast } from '@/hooks/use-toast';

export const usePaymentReminders = () => {
  return useQuery({
    queryKey: ['payment-reminders'],
    queryFn: async (): Promise<PaymentReminder[]> => {
      const { data, error } = await supabase
        .from('payment_reminders')
        .select('*')
        .order('due_date', { ascending: true });

      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        collaborators: Array.isArray(row.collaborators) ? row.collaborators.map(String) : [],
        status: (row.status as 'pending' | 'completed') || 'pending',
        amount: row.amount || undefined,
        notes: row.notes || undefined,
        org_id: row.org_id || undefined,
        reminder_start_date: row.reminder_start_date || '',
        reminder_type: (row.reminder_type as 'daily' | 'weekly' | 'annually') || 'daily',
        reminder_status: (row.reminder_status as 'open' | 'pending_authorization' | 'pending_payment' | 'completed') || 'open',
        payment_proof_url: row.payment_proof_url || undefined,
        authorization_required: row.authorization_required || false,
        authorized_by: row.authorized_by || undefined,
        authorized_at: row.authorized_at || undefined,
      }));
    },
  });
};

export const useCreatePaymentReminder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (reminder: CreatePaymentReminderRequest): Promise<PaymentReminder> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('payment_reminders')
        .insert([{
          ...reminder,
          created_by: user.id,
          collaborators: reminder.collaborators || [],
        }])
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        collaborators: Array.isArray(data.collaborators) ? data.collaborators.map(String) : [],
        status: (data.status as 'pending' | 'completed') || 'pending',
        amount: data.amount || undefined,
        notes: data.notes || undefined,
        org_id: data.org_id || undefined,
        reminder_start_date: data.reminder_start_date || '',
        reminder_type: (data.reminder_type as 'daily' | 'weekly' | 'annually') || 'daily',
        reminder_status: (data.reminder_status as 'open' | 'pending_authorization' | 'pending_payment' | 'completed') || 'open',
        payment_proof_url: data.payment_proof_url || undefined,
        authorization_required: data.authorization_required || false,
        authorized_by: data.authorized_by || undefined,
        authorized_at: data.authorized_at || undefined,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-reminders'] });
      toast({
        title: "Success",
        description: "Payment reminder created successfully",
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

export const useUpdatePaymentReminder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdatePaymentReminderRequest }): Promise<PaymentReminder> => {
      const { data, error } = await supabase
        .from('payment_reminders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        collaborators: Array.isArray(data.collaborators) ? data.collaborators.map(String) : [],
        status: (data.status as 'pending' | 'completed') || 'pending',
        amount: data.amount || undefined,
        notes: data.notes || undefined,
        org_id: data.org_id || undefined,
        reminder_start_date: data.reminder_start_date || '',
        reminder_type: (data.reminder_type as 'daily' | 'weekly' | 'annually') || 'daily',
        reminder_status: (data.reminder_status as 'open' | 'pending_authorization' | 'pending_payment' | 'completed') || 'open',
        payment_proof_url: data.payment_proof_url || undefined,
        authorization_required: data.authorization_required || false,
        authorized_by: data.authorized_by || undefined,
        authorized_at: data.authorized_at || undefined,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-reminders'] });
      toast({
        title: "Success",
        description: "Payment reminder updated successfully",
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

export const useDeletePaymentReminder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('payment_reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-reminders'] });
      toast({
        title: "Success",
        description: "Payment reminder deleted successfully",
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