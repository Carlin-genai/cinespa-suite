
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
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    const tasks = (data || []).map(mapDbTaskToTask);
    return tasks;
  }

  // Get self tasks (tasks assigned by user to themselves)
  async getSelfTasks(): Promise<Task[]> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .or(`and(assigned_to.eq.${user.id},assigned_by.eq.${user.id}),and(assigned_to.eq.${user.id},is_self_task.eq.true)`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapDbTaskToTask);
  }

  async createTask(task: Partial<Task>): Promise<Task> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('tasks')
      .insert([{ 
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'pending',
        priority: task.priority || 'medium',
        assigned_to: task.assigned_to || user.id, // Default to current user if not specified
        assigned_by: task.assigned_by || user.id, // Always set assigned_by to current user
        due_date: task.due_date,
        notes: task.notes,
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

  // Notifications - role-based visibility
  async getNotifications(): Promise<any[]> {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('User not authenticated');

    // Get user role to determine what notifications to show
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (roleError && roleError.code !== 'PGRST116') throw roleError;

    const role = userRole?.role || 'employee';

    if (role === 'admin') {
      // Admin sees notifications for tasks assigned by them
      const { data: adminTasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('assigned_by', userId);
      
      const taskIds = adminTasks?.map(task => task.id) || [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          tasks!notifications_task_id_fkey(
            id,
            title,
            assigned_to,
            assigned_by
          )
        `)
        .in('task_id', taskIds)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } else {
      // Employee sees notifications for tasks assigned to them
      const { data: employeeTasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('assigned_to', userId);
      
      const taskIds = employeeTasks?.map(task => task.id) || [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          tasks!notifications_task_id_fkey(
            id,
            title,
            assigned_to,
            assigned_by
          )
        `)
        .in('task_id', taskIds)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
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

  // Team Management
  async getTeams(): Promise<any[]> {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_members(
          id,
          user_id,
          profiles(full_name, email)
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async createTeam(team: { name: string; description?: string }): Promise<any> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    // Get user's org_id from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    const { data, error } = await supabase
      .from('teams')
      .insert([{
        name: team.name,
        description: team.description,
        org_id: profile.org_id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateTeam(id: string, team: { name?: string; description?: string }): Promise<any> {
    const { data, error } = await supabase
      .from('teams')
      .update(team)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteTeam(id: string): Promise<void> {
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  async addTeamMember(teamId: string, userId: string): Promise<void> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    // Get user's org_id from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    const { error } = await supabase
      .from('team_members')
      .insert([{
        team_id: teamId,
        user_id: userId,
        org_id: profile.org_id
      }]);
    
    if (error) throw error;
  }

  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);
    
    if (error) throw error;
  }

  async getUsers(): Promise<any[]> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    // Get user's org_id from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('org_id', profile.org_id)
      .order('full_name', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }
}

export const supabaseApi = new SupabaseApiService();
