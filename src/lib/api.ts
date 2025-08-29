import { Task, User, Project } from '@/types';

const BASE_URLS = [
  'http://127.0.0.1:5000',
  'http://192.168.1.4:5000'
];

let currentBaseUrl = BASE_URLS[0];

class ApiService {
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
    return this.makeRequest<Task[]>('/api/tasks');
  }

  async createTask(task: Partial<Task>): Promise<Task> {
    return this.makeRequest<Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  async updateTask(id: string, task: Partial<Task>): Promise<Task> {
    const result = await this.makeRequest<Task>(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(task),
    });

    // If task is being marked as completed, notify admin
    if (task.status === 'completed') {
      try {
        await this.createNotification({
          type: 'task_completion',
          title: 'Task Completed',
          message: `Task "${result.title}" has been completed by ${result.assigned_to}`,
          recipient_type: 'admin',
          task_id: id
        });
      } catch (error) {
        console.log('Failed to send completion notification:', error);
        // Don't throw error for notification failure
      }
    }

    return result;
  }

  async deleteTask(id: string): Promise<void> {
    return this.makeRequest<void>(`/api/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // User Management
  async getUsers(): Promise<User[]> {
    return this.makeRequest<User[]>('/api/users');
  }

  async createUser(user: Partial<User>): Promise<User> {
    return this.makeRequest<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  }

  async loginUser(credentials: { email: string; password: string }): Promise<{ user: User; token: string }> {
    return this.makeRequest<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async signupUser(userData: { name: string; email: string; password: string; role?: string }): Promise<{ user: User; token: string }> {
    return this.makeRequest<{ user: User; token: string }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async logoutUser(): Promise<void> {
    return this.makeRequest<void>('/api/auth/logout', {
      method: 'POST',
    });
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return this.makeRequest<Project[]>('/api/projects');
  }

  async createProject(project: Partial<Project>): Promise<Project> {
    return this.makeRequest<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    });
  }

  // Analytics
  async getAnalytics(): Promise<any> {
    return this.makeRequest<any>('/api/analytics');
  }

  async getReports(): Promise<any> {
    return this.makeRequest<any>('/api/reports');
  }

  // Notifications
  async getNotifications(): Promise<any[]> {
    return this.makeRequest<any[]>('/api/notifications');
  }

  async markNotificationRead(id: string): Promise<void> {
    return this.makeRequest<void>(`/api/notifications/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ read: true }),
    });
  }

  // Reminders
  async getReminders(): Promise<any[]> {
    return this.makeRequest<any[]>('/api/reminders');
  }

  async createReminder(reminder: any): Promise<any> {
    return this.makeRequest<any>('/api/reminders', {
      method: 'POST',
      body: JSON.stringify(reminder),
    });
  }

  // Daily Journal
  async getJournalEntries(): Promise<any[]> {
    return this.makeRequest<any[]>('/api/journal');
  }

  async createJournalEntry(entry: any): Promise<any> {
    return this.makeRequest<any>('/api/journal', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  }

  async updateJournalEntry(id: string, entry: any): Promise<any> {
    return this.makeRequest<any>(`/api/journal/${id}`, {
      method: 'PUT',
      body: JSON.stringify(entry),
    });
  }

  async deleteJournalEntry(id: string): Promise<void> {
    return this.makeRequest<void>(`/api/journal/${id}`, {
      method: 'DELETE',
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string; backend_url: string }> {
    return this.makeRequest<{ status: string; backend_url: string }>('/api/health');
  }

  // Create notification
  async createNotification(notification: {
    type: string;
    title: string;
    message: string;
    recipient_type?: string;
    task_id?: string;
  }): Promise<any> {
    return this.makeRequest<any>('/api/notifications', {
      method: 'POST',
      body: JSON.stringify(notification),
    });
  }
}

export const apiService = new ApiService();
