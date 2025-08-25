
import { supabase } from '@/integrations/supabase/client';
import { Task, User, Project } from '@/types';

// Helper mappers to normalize DB rows into our Task union types
const STATUS_SET = new Set<Task['status']>(['pending', 'in-progress', 'completed', 'overdue']);
const PRIORITY_SET = new Set<Task['priority']>(['low', 'medium', 'high', 'critical']);

function mapStatus(value: string | null | undefined): Task['status'] {
  const s = (value || '').toLowerCase();
  return STATUS_SET.has(s as Task['status']) ? (s as Task['status']) : 'pending';
}

function mapPriority(value: string | null | undefined): Task['priority'] {
  const p = (value || '').toLowerCase();
  return PRIORITY_SET.has(p as Task['priority']) ? (p as Task['priority']) : 'medium';
}

function mapDbTaskToTask(row: any): Task {
  return {
    id: row?.id ?? '',
    title: row?.title ?? '',
    description: row?.description ?? '',
    status: mapStatus(row?.status),
    priority: mapPriority(row?.priority),
    assigned_to: row?.assigned_to ?? '',
    assigned_by: row?.assigned_by ?? '',
    due_date: row?.due_date ?? '',
    notes: row?.notes ?? undefined,
    created_at: row?.created_at ?? '',
    updated_at: row?.updated_at ?? '',
  };
}

export class SupabaseApiService {
  // Task Management
  async getTasks(): Promise<Task[]> {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', userId);

    if (error) throw error;
    const tasks = (data || []).map(mapDbTaskToTask);
    return tasks;
  }

  async getTeamTasks(): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*');
    
    if (error) throw error;
    const tasks = (data || []).map(mapDbTaskToTask);
    return tasks;
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
    return mapDbTaskToTask(data);
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
    return mapDbTaskToTask(data);
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
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    return data || [];
  }

  // Notifications
  async getNotifications(): Promise<any[]> {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
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
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { data, error } = await supabase
      .from('daily_journal')
      .select('*')
      .eq('user_id', userId)
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
