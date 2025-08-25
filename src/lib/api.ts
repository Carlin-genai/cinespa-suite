
const BASE_URLS = [
  'http://127.0.0.1:5000',
  'http://192.168.1.4:5000'
];

let currentBaseUrl = BASE_URLS[0];

class ApiService {
  private async makeRequest(endpoint: string, options: RequestInit = {}) {
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
        return this.makeRequest(endpoint, options);
      }
      
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Task Management
  async getTasks() {
    return this.makeRequest('/api/tasks');
  }

  async createTask(task: any) {
    return this.makeRequest('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  async updateTask(id: string, task: any) {
    return this.makeRequest(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(task),
    });
  }

  async deleteTask(id: string) {
    return this.makeRequest(`/api/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // User Management
  async getUsers() {
    return this.makeRequest('/api/users');
  }

  async createUser(user: any) {
    return this.makeRequest('/api/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  }

  // Projects
  async getProjects() {
    return this.makeRequest('/api/projects');
  }

  async createProject(project: any) {
    return this.makeRequest('/api/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    });
  }

  // Analytics
  async getAnalytics() {
    return this.makeRequest('/api/analytics');
  }

  async getReports() {
    return this.makeRequest('/api/reports');
  }

  // Notifications
  async getNotifications() {
    return this.makeRequest('/api/notifications');
  }

  async markNotificationRead(id: string) {
    return this.makeRequest(`/api/notifications/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ read: true }),
    });
  }
}

export const apiService = new ApiService();
