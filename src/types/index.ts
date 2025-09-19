
export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high';
  assigned_to: string;
  assigned_by: string;
  due_date: string;
  notes?: string;
  admin_rating?: number;
  admin_comment?: string;
  created_at: string;
  updated_at: string;
  time_limit?: number;
  credit_points?: number;
  attachment_url?: string;
  attachments?: any[];
  completion_attachments?: any[];
  actual_hours?: number;
  estimated_hours?: number;
  is_self_task?: boolean;
  created_by?: string;
  team_id?: string;
  org_id?: string;
  completed_at?: string;
  task_type?: 'self' | 'team';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'technician' | 'user';
  avatar?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  startDate: string;
  endDate: string;
  tasks: Task[];
}
