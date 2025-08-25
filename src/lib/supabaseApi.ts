
import { supabase } from '@/integrations/supabase/client';
import { Task, User, Project } from '@/types';

export class SupabaseApiService {
  // Task Management
  async getTasks(): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', (await supabase.auth.getUser()).data.user?.id);
    
    if (error) throw error;
    return data || [];
  }

  async getTeamTasks(): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*');
    
    if (error) throw error;
    return data || [];
  }

  async createTask(task: Partial<Task>): Promise<Task> {
    const user = (await supabase.auth.getUser()).data.user;
    const { data, error } = await supabase
      .from('tasks')
      .insert([{ 
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'pending',
        priority: task.priority || 'medium',
        assigned_to: task.assigned_to,
        due_date: task.due_date,
        notes: task.notes,
        assigned_by: user?.id 
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateTask(id: string, task: Partial<Task>): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .update({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assigned_to: task.assigned_to,
        due_date: task.due_date,
        notes: task.notes
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteTask(id: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Reminders
  async createReminder(reminder: { task_id: string; message: string; reminder_time: string }): Promise<void> {
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase
      .from('reminders')
      .insert([{
        ...reminder,
        user_id: user?.id
      }]);
    
    if (error) throw error;
  }

  async getReminders(): Promise<any[]> {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
    
    if (error) throw error;
    return data || [];
  }

  // Notifications
  async getNotifications(): Promise<any[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async markNotificationRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    
    if (error) throw error;
  }

  // Daily Journal
  async getDailyJournalEntries(): Promise<any[]> {
    const { data, error } = await supabase
      .from('daily_journal')
      .select('*')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async createJournalEntry(entry: { date: string; content: string; task_updates?: any[] }): Promise<void> {
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase
      .from('daily_journal')
      .insert([{
        ...entry,
        user_id: user?.id
      }]);
    
    if (error) throw error;
  }

  async updateJournalEntry(id: string, entry: { content: string; task_updates?: any[] }): Promise<void> {
    const { error } = await supabase
      .from('daily_journal')
      .update(entry)
      .eq('id', id);
    
    if (error) throw error;
  }
}

export const supabaseApi = new SupabaseApiService();
