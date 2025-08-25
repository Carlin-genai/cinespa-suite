
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

      return await response.json();
    } catch (error) {
      // Try alternative URL if primary fails
      if (currentBaseUrl === BASE_URLS[0]) {
        currentBaseUrl = BASE_URLS[1];
        console.log(`Switching to alternative backend: ${currentBaseUrl}`);
        return this.makeRequest<T>(endpoint, options);
      }
      
      console.error('API request failed:', error);
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
    return this.makeRequest<Task>(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(task),
    });
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
}

export const apiService = new ApiService();
