export interface PaymentReminder {
  id: string;
  name: string;
  due_date: string;
  amount?: number;
  notes?: string;
  collaborators: string[];
  created_by: string;
  status: 'pending' | 'completed';
  reminder_start_date: string;
  org_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentReminderRequest {
  name: string;
  due_date: string;
  amount?: number;
  notes?: string;
  collaborators?: string[];
}

export interface UpdatePaymentReminderRequest {
  name?: string;
  due_date?: string;
  amount?: number;
  notes?: string;
  collaborators?: string[];
  status?: 'pending' | 'completed';
}