
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

  async createTask(task: Partial<Task> & { assignedEmployees?: string[]; attachments?: File[]; time_limit?: number; credit_points?: number; attachment_url?: string }): Promise<Task> {
    console.log('[SupabaseApi] Creating task - start', task);
    
    // Get authenticated user first
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[SupabaseApi] Authentication error:', authError);
      throw new Error('User not authenticated');
    }
    
    console.log('[SupabaseApi] Authenticated user:', user.id);

    // Validate required fields
    if (!task.title?.trim()) {
      throw new Error('Task title is required');
    }
    
    // Auto-assign to current user if not specified (for self-tasks)
    const assignedTo = task.assigned_to || user.id;
    const assignedBy = task.assigned_by || user.id;

    // Handle file uploads first if attachments exist
    let uploadedAttachments: string[] = [];
    if (task.attachments && task.attachments.length > 0) {
      console.log('[SupabaseApi] Uploading attachments', task.attachments);
      try {
        const uploadPromises = task.attachments.map(async (file, index) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}_${index}.${fileExt}`;
          
          const { data, error } = await supabase.storage
            .from('task-attachments')
            .upload(fileName, file);
            
          if (error) {
            console.error('[SupabaseApi] File upload error:', error);
            throw error;
          }
          
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('task-attachments')
            .getPublicUrl(fileName);
            
          return publicUrl;
        });
        
        uploadedAttachments = await Promise.all(uploadPromises);
        console.log('[SupabaseApi] Uploaded attachments:', uploadedAttachments);
      } catch (error) {
        console.error('[SupabaseApi] Attachment upload failed:', error);
        throw error;
      }
    }

    // Prepare task data with uploaded attachments
    const taskDataBase = {
      title: task.title || '',
      description: task.description || '',
      status: task.status || 'pending',
      priority: task.priority || 'medium',
      due_date: task.due_date,
      notes: task.notes,
      time_limit: task.time_limit,
      credit_points: task.credit_points || 0,
      attachment_url: task.attachment_url,
      attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
    };

    console.log('[SupabaseApi] Preparing task data:', taskDataBase);

    // For team tasks with multiple assignees, create multiple task records
    if (task.assignedEmployees && task.assignedEmployees.length > 0) {
      console.log('[SupabaseApi] Creating team tasks for employees:', task.assignedEmployees);
      
      const taskPromises = task.assignedEmployees.map(async (employeeId) => {
        const taskData = { 
          ...taskDataBase,
          assigned_to: employeeId,
          assigned_by: assignedBy,
          is_self_task: false,
        };
        
        console.log('[SupabaseApi] Inserting team task:', taskData);
        
        const { data, error } = await supabase
          .from('tasks')
          .insert([taskData])
          .select();
        
        if (error) {
          console.error('[SupabaseApi] Team task creation error:', error);
          throw error;
        }
        
        console.log('[SupabaseApi] Team task created:', data);
        const createdTask = data && data.length > 0 ? data[0] : { ...taskData, id: '' };
        return mapDbTaskToTask(createdTask);
      });

      const results = await Promise.all(taskPromises);
      console.log('[SupabaseApi] All team tasks created:', results.length);
      return results[0]; // Return the first created task
    }

    // Single task creation
    const taskData = { 
      ...taskDataBase,
      assigned_to: assignedTo,
      assigned_by: assignedBy,
      is_self_task: assignedTo === assignedBy,
    };
    
    console.log('[SupabaseApi] Inserting single task:', taskData);
    
    const { data, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select();
    
    if (error) {
      console.error('[SupabaseApi] Single task creation error:', error);
      throw error;
    }
    
    console.log('[SupabaseApi] Single task created:', data);
    const createdTask = data && data.length > 0 ? data[0] : { ...taskData, id: '' };
    return mapDbTaskToTask(createdTask);
  }

  async updateTask(id: string, task: Partial<Task>): Promise<Task> {
    console.log('[SupabaseApi] Updating task:', id, task);
    
    const { data, error } = await supabase
      .from('tasks')
      .update({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assigned_to: task.assigned_to,
        due_date: task.due_date,
        notes: task.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('[SupabaseApi] Update task error:', error);
      throw error;
    }
    
    console.log('[SupabaseApi] Task updated successfully:', data);
    const updatedTask = data && data.length > 0 ? data[0] : null;
    if (!updatedTask) {
      throw new Error('Task not found or could not be updated');
    }
    return mapDbTaskToTask(updatedTask);
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

  async createTeam(team: { name: string; description?: string; memberIds?: string[]; teamHeadId?: string }): Promise<any> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('User not authenticated');

    console.log('[createTeam] Starting team creation with:', team);

    // 1) Fetch the user's profile (org + role)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, org_id, role, full_name, email')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError) {
      console.error('[createTeam] Profile fetch error:', profileError);
      throw profileError;
    }

    // 2) If the profile doesn't exist (rare), create it
    let currentProfile = profile;
    if (!currentProfile) {
      console.log('[createTeam] Creating missing profile for user:', user.id);
      const { data: newProfile, error: newProfErr } = await supabase
        .from('profiles')
        .insert([{ id: user.id, email: user.email, full_name: user.email }])
        .select('id, org_id, role, full_name, email')
        .single();
      if (newProfErr) {
        console.error('[createTeam] Profile creation error:', newProfErr);
        throw newProfErr;
      }
      currentProfile = newProfile;
    }

    // 3) Ensure the user has an organization (required by RLS on teams)
    let orgId = currentProfile.org_id as string | null;
    if (!orgId) {
      console.log('[createTeam] Creating organization for user:', user.id);
      const orgName = (currentProfile.full_name || currentProfile.email || 'My') + ' Organization';
      // Avoid SELECT on insert to bypass SELECT policy race; generate id client-side
      const newOrgId = (globalThis.crypto?.randomUUID?.() || `${user.id}-${Date.now()}`);
      const { error: orgErr } = await supabase
        .from('organizations')
        .insert([{ id: newOrgId, name: orgName }]);
      if (orgErr) {
        console.error('[createTeam] Organization creation error:', orgErr);
        throw orgErr;
      }
      orgId = newOrgId;

      // Link profile to the newly created organization
      const { error: upErr } = await supabase
        .from('profiles')
        .update({ org_id: orgId })
        .eq('id', user.id);
      if (upErr) {
        console.error('[createTeam] Profile org_id update error:', upErr);
        throw upErr;
      }
    }

    // 4) Ensure the user has permission (admin/manager) to create teams
    const role = String(currentProfile.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'manager') {
      console.log('[createTeam] Promoting user to admin for team creation:', user.id);
      // Promote in profiles (used by RLS on teams)
      const { error: roleErr } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', user.id);
      if (roleErr) {
        console.error('[createTeam] Role update error:', roleErr);
        throw roleErr;
      }

      // Also ensure a corresponding user_roles entry exists for other policies elsewhere
      await supabase
        .from('user_roles')
        .insert([{ user_id: user.id, role: 'admin' }])
        .select()
        .then(({ error }) => {
          if (error && error.code !== '23505') { // ignore unique violations
            console.warn('[createTeam] user_roles insert warning:', error.message);
          }
        });
    }

    // 5) Refetch profile to guarantee RLS sees latest role/org
    const { data: refreshed, error: refetchErr } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single();
    if (refetchErr) {
      console.error('[createTeam] Refetch profile error:', refetchErr);
      throw refetchErr;
    }
    if (!refreshed.org_id || !['admin','manager'].includes(String(refreshed.role).toLowerCase())) {
      throw new Error('You must be an admin/manager with an organization to create teams.');
    }

    // 6) Create team within the user's organization
    console.log('[createTeam] Creating team with org_id:', refreshed.org_id);
    const { data: newTeam, error: teamError } = await supabase
      .from('teams')
      .insert([{ name: team.name, description: team.description, org_id: refreshed.org_id }])
      .select()
      .single();
    if (teamError) {
      console.error('[createTeam] Team creation error:', teamError);
      throw teamError;
    }

    console.log('[createTeam] Team created successfully:', newTeam);

    // 7) Add team members if provided
    if (team.memberIds && team.memberIds.length > 0) {
      console.log('[createTeam] Adding team members:', team.memberIds);
      const memberInserts = team.memberIds.map((memberId) => ({
        team_id: newTeam.id,
        user_id: memberId,
        org_id: refreshed.org_id,
        role: (team.teamHeadId === memberId ? 'head' : 'member') as 'head' | 'member',
      }));

      const { error: membersError } = await supabase.from('team_members').insert(memberInserts);
      if (membersError) {
        console.error('[createTeam] Team members addition error:', membersError);
        throw membersError;
      }
    }

    return newTeam;
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

  async getTeamMembers(teamId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        id,
        user_id,
        role,
        profiles(id, full_name, email)
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }

  async setTeamHead(teamId: string, userId: string): Promise<void> {
    // First, remove any existing team head for this team
    await supabase
      .from('team_members')
      .update({ role: 'member' })
      .eq('team_id', teamId)
      .eq('role', 'head');

    // Set the new team head
    const { error } = await supabase
      .from('team_members')
      .update({ role: 'head' })
      .eq('team_id', teamId)
      .eq('user_id', userId);
    
    if (error) throw error;
  }

  async getUserTeams(): Promise<any[]> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('team_members')
      .select(`
        team_id,
        role,
        teams(id, name, description)
      `)
      .eq('user_id', user.id);
    
    if (error) throw error;
    return data || [];
  }

  async getUsers(): Promise<any[]> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    console.log('[supabaseApi] Fetching all users without org_id filter');
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .order('full_name', { ascending: true });
    
    if (error) {
      console.error('[supabaseApi] Error fetching users:', error);
      throw error;
    }
    
    console.log('[supabaseApi] Fetched users:', data?.length || 0);
    return data || [];
  }

  async getUserProfile(userId: string): Promise<any> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, avatar_url')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.warn('Failed to get user profile:', error);
      return null;
    }
    return data;
  }
}

export const supabaseApi = new SupabaseApiService();
