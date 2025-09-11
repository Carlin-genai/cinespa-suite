
import { Task, User, Project } from '@/types';
import { supabaseApi } from './supabaseApi';

const BASE_URLS = [
  'http://127.0.0.1:5000',
  'http://192.168.1.4:5000'
];

let currentBaseUrl = BASE_URLS[0];

// Check if we should use local mode - DISABLED, always use Supabase
const useLocalMode = false;

class ApiService {
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // If in local mode, delegate to local API
    if (useLocalMode) {
      console.log('Using local storage mode');
      throw new Error('Should use local API service');
    }

    const url = `${currentBaseUrl}${endpoint}`;
    
    try {
      console.log(`Making request to: ${url}`);
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`Response from ${url}:`, data);
      return data;
    } catch (error) {
      console.error(`Request to ${url} failed:`, error);
      
      // Try alternative URL if primary fails
      if (currentBaseUrl === BASE_URLS[0]) {
        currentBaseUrl = BASE_URLS[1];
        console.log(`Switching to alternative backend: ${currentBaseUrl}`);
        return this.makeRequest<T>(endpoint, options);
      }
      
      console.error('All backend URLs failed:', error);
      throw error;
    }
  }

  // Task Management
  async getTasks(): Promise<Task[]> {
    return supabaseApi.getTasks();
  }

  async createTask(task: Partial<Task> & { attachments?: File[] }): Promise<Task> {
    return supabaseApi.createTask(task);
  }

  async updateTask(id: string, task: Partial<Task>): Promise<Task> {
    return supabaseApi.updateTask(id, task);
  }

  async deleteTask(id: string): Promise<void> {
    return supabaseApi.deleteTask(id);
  }

  // User Management - Not needed for Supabase mode
  async getUsers(): Promise<User[]> {
    return []; // Not implemented for Supabase mode
  }

  async createUser(user: Partial<User>): Promise<User> {
    throw new Error('User creation handled by Supabase Auth');
  }

  async loginUser(credentials: { email: string; password: string }): Promise<{ user: User; token: string }> {
    throw new Error('Login handled by Supabase Auth');
  }

  async signupUser(userData: { name: string; email: string; password: string; role?: string }): Promise<{ user: User; token: string }> {
    throw new Error('Signup handled by Supabase Auth');
  }

  async logoutUser(): Promise<void> {
    // Handled by AuthContext
    return;
  }

  // Projects - Not implemented for now
  async getProjects(): Promise<Project[]> {
    return [];
  }

  async createProject(project: Partial<Project>): Promise<Project> {
    throw new Error('Projects not implemented yet');
  }

  // Analytics - Mock data for now
  async getAnalytics(): Promise<any> {
    return {
      total_tasks: 0,
      completed_tasks: 0,
      pending_tasks: 0,
      in_progress_tasks: 0,
      overdue_tasks: 0
    };
  }

  async getReports(): Promise<any> {
    return this.getAnalytics();
  }

  // Notifications - Use Supabase
  async getNotifications(): Promise<any[]> {
    return supabaseApi.getNotifications();
  }

  async markNotificationRead(id: string): Promise<void> {
    return supabaseApi.markNotificationRead(id);
  }

  // Reminders - Use Supabase  
  async getReminders(): Promise<any[]> {
    return supabaseApi.getReminders();
  }

  async createReminder(reminder: any): Promise<any> {
    return supabaseApi.createReminder(reminder);
  }

  // Daily Journal - Use Supabase
  async getJournalEntries(): Promise<any[]> {
    return supabaseApi.getDailyJournalEntries();
  }

  async createJournalEntry(entry: any): Promise<any> {
    return supabaseApi.createJournalEntry(entry);
  }

  async updateJournalEntry(id: string, entry: any): Promise<any> {
    return supabaseApi.updateJournalEntry(id, entry);
  }

  async deleteJournalEntry(id: string): Promise<void> {
    // Not implemented in supabaseApi yet
    throw new Error('Delete journal entry not implemented yet');
  }

  // Health check
  async healthCheck(): Promise<{ status: string; backend_url: string }> {
    return {
      status: 'healthy',
      backend_url: 'supabase'
    };
  }

  // Create notification - Not implemented yet
  async createNotification(notification: {
    type: string;
    title: string;
    message: string;
    recipient_type?: string;
    task_id?: string;
  }): Promise<any> {
    // Not implemented yet for Supabase
    console.log('Notification creation not implemented yet:', notification);
    return null;
  }
}

export const apiService = new ApiService();
