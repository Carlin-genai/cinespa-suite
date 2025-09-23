export type ReminderType = 'daily' | 'weekly' | 'annually';
export type ReminderStatus = 'open' | 'pending_authorization' | 'pending_payment' | 'completed';

export interface PaymentReminder {
  id: string;
  name: string;
  due_date: string;
  amount?: number;
  currency: string;
  notes?: string;
  collaborators: string[];
  created_by: string;
  status: 'pending' | 'completed';
  reminder_start_date: string;
  org_id?: string;
  created_at: string;
  updated_at: string;
  reminder_type: ReminderType;
  reminder_status: ReminderStatus;
  payment_proof_url?: string;
  authorization_required: boolean;
  authorized_by?: string;
  authorized_at?: string;
}

export interface CreatePaymentReminderRequest {
  name: string;
  due_date: string;
  amount?: number;
  currency?: string;
  notes?: string;
  collaborators?: string[];
  reminder_type?: ReminderType;
  authorization_required?: boolean;
}

export interface UpdatePaymentReminderRequest {
  name?: string;
  due_date?: string;
  amount?: number;
  currency?: string;
  notes?: string;
  collaborators?: string[];
  status?: 'pending' | 'completed';
  reminder_status?: ReminderStatus;
  payment_proof_url?: string;
  authorized_by?: string;
  authorized_at?: string;
}