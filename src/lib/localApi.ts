
import { Task, User, Project } from '@/types';

// Generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Additional type definitions for local storage
interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  recipient_type?: string;
  task_id?: string;
  read: boolean;
  created_at: string;
}

interface Reminder {
  id: string;
  is_sent: boolean;
  created_at: string;
  [key: string]: any;
}

interface JournalEntry {
  id: string;
  created_at: string;
  [key: string]: any;
}

// Storage keys
const STORAGE_KEYS = {
  TASKS: 'cinespa_tasks',
  USERS: 'cinespa_users',
  PROJECTS: 'cinespa_projects',
  NOTIFICATIONS: 'cinespa_notifications',
  REMINDERS: 'cinespa_reminders',
  JOURNAL: 'cinespa_journal',
  CURRENT_USER: 'cinespa_current_user'
};

// Initialize with sample data if empty
const initializeStorage = () => {
  if (!localStorage.getItem(STORAGE_KEYS.TASKS)) {
    const sampleTasks: Task[] = [
      {
        id: '1',
        title: 'Install Home Theater System',
        description: 'Complete installation of premium home theater system for client',
        status: 'in-progress',
        priority: 'high',
        assigned_to: 'current-user',
        assigned_by: 'admin',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        notes: 'Client prefers evening installation'
      },
      {
        id: '2',
        title: 'Configure Automation System',
        description: 'Set up lighting and climate automation for luxury villa',
        status: 'pending',
        priority: 'medium',
        assigned_to: 'current-user',
        assigned_by: 'admin',
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(sampleTasks));
  }

  if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
  }

  if (!localStorage.getItem(STORAGE_KEYS.REMINDERS)) {
    localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify([]));
  }

  if (!localStorage.getItem(STORAGE_KEYS.JOURNAL)) {
    localStorage.setItem(STORAGE_KEYS.JOURNAL, JSON.stringify([]));
  }
};

export class LocalApiService {
  constructor() {
    initializeStorage();
  }

  // Helper methods
  private getFromStorage<T>(key: string): T[] {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  private saveToStorage<T>(key: string, data: T[]): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // Task Management
  async getTasks(): Promise<Task[]> {
    return this.getFromStorage<Task>(STORAGE_KEYS.TASKS);
  }

  async createTask(task: Partial<Task>): Promise<Task> {
    const tasks = this.getFromStorage<Task>(STORAGE_KEYS.TASKS);
    const newTask: Task = {
      id: generateId(),
      title: task.title || '',
      description: task.description || '',
      status: task.status || 'pending',
      priority: task.priority || 'medium',
      assigned_to: task.assigned_to || 'current-user',
      assigned_by: task.assigned_by || 'admin',
      due_date: task.due_date || '',
      notes: task.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    tasks.push(newTask);
    this.saveToStorage(STORAGE_KEYS.TASKS, tasks);
    return newTask;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const tasks = this.getFromStorage<Task>(STORAGE_KEYS.TASKS);
    const taskIndex = tasks.findIndex(task => task.id === id);
    
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }

    tasks[taskIndex] = {
      ...tasks[taskIndex],
      ...updates,
      updated_at: new Date().toISOString()
    };

    // If task is marked as completed, create a notification
    if (updates.status === 'completed') {
      await this.createNotification({
        type: 'task_completion',
        title: 'Task Completed',
        message: `Task "${tasks[taskIndex].title}" has been completed`,
        recipient_type: 'admin',
        task_id: id
      });
    }

    this.saveToStorage(STORAGE_KEYS.TASKS, tasks);
    return tasks[taskIndex];
  }

  async deleteTask(id: string): Promise<void> {
    const tasks = this.getFromStorage<Task>(STORAGE_KEYS.TASKS);
    const filteredTasks = tasks.filter(task => task.id !== id);
    this.saveToStorage(STORAGE_KEYS.TASKS, filteredTasks);
  }

  // User Management (simplified for local mode)
  async getUsers(): Promise<User[]> {
    return []; // Not needed for local mode
  }

  async createUser(user: Partial<User>): Promise<User> {
    throw new Error('User creation not supported in local mode');
  }

  async loginUser(credentials: { email: string; password: string }): Promise<{ user: User; token: string }> {
    throw new Error('Login handled by Supabase in local mode');
  }

  async signupUser(userData: { name: string; email: string; password: string; role?: string }): Promise<{ user: User; token: string }> {
    throw new Error('Signup handled by Supabase in local mode');
  }

  async logoutUser(): Promise<void> {
    // Clear local storage on logout
    Object.values(STORAGE_KEYS).forEach(key => {
      if (key !== STORAGE_KEYS.CURRENT_USER) {
        localStorage.removeItem(key);
      }
    });
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return this.getFromStorage<Project>(STORAGE_KEYS.PROJECTS);
  }

  async createProject(project: Partial<Project>): Promise<Project> {
    const projects = this.getFromStorage<Project>(STORAGE_KEYS.PROJECTS);
    const newProject = {
      id: generateId(),
      name: project.name || '',
      description: project.description || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...project
    } as Project;
    
    projects.push(newProject);
    this.saveToStorage(STORAGE_KEYS.PROJECTS, projects);
    return newProject;
  }

  // Analytics (mock data)
  async getAnalytics(): Promise<any> {
    const tasks = this.getFromStorage<Task>(STORAGE_KEYS.TASKS);
    return {
      total_tasks: tasks.length,
      completed_tasks: tasks.filter(t => t.status === 'completed').length,
      pending_tasks: tasks.filter(t => t.status === 'pending').length,
      in_progress_tasks: tasks.filter(t => t.status === 'in-progress').length,
      overdue_tasks: tasks.filter(t => t.status === 'overdue').length
    };
  }

  async getReports(): Promise<any> {
    return this.getAnalytics();
  }

  // Notifications
  async getNotifications(): Promise<Notification[]> {
    return this.getFromStorage<Notification>(STORAGE_KEYS.NOTIFICATIONS);
  }

  async markNotificationRead(id: string): Promise<void> {
    const notifications = this.getFromStorage<Notification>(STORAGE_KEYS.NOTIFICATIONS);
    const notificationIndex = notifications.findIndex(n => n.id === id);
    
    if (notificationIndex !== -1) {
      notifications[notificationIndex].read = true;
      this.saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notifications);
    }
  }

  async createNotification(notification: {
    type: string;
    title: string;
    message: string;
    recipient_type?: string;
    task_id?: string;
  }): Promise<Notification> {
    const notifications = this.getFromStorage<Notification>(STORAGE_KEYS.NOTIFICATIONS);
    const newNotification: Notification = {
      id: generateId(),
      ...notification,
      read: false,
      created_at: new Date().toISOString()
    };
    
    notifications.unshift(newNotification);
    this.saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notifications);
    return newNotification;
  }

  // Reminders
  async getReminders(): Promise<Reminder[]> {
    return this.getFromStorage<Reminder>(STORAGE_KEYS.REMINDERS);
  }

  async createReminder(reminder: Partial<Reminder>): Promise<Reminder> {
    const reminders = this.getFromStorage<Reminder>(STORAGE_KEYS.REMINDERS);
    const newReminder: Reminder = {
      id: generateId(),
      ...reminder,
      is_sent: false,
      created_at: new Date().toISOString()
    };
    
    reminders.push(newReminder);
    this.saveToStorage(STORAGE_KEYS.REMINDERS, reminders);
    return newReminder;
  }

  // Daily Journal
  async getJournalEntries(): Promise<JournalEntry[]> {
    return this.getFromStorage<JournalEntry>(STORAGE_KEYS.JOURNAL);
  }

  async createJournalEntry(entry: Partial<JournalEntry>): Promise<JournalEntry> {
    const entries = this.getFromStorage<JournalEntry>(STORAGE_KEYS.JOURNAL);
    const newEntry: JournalEntry = {
      id: generateId(),
      ...entry,
      created_at: new Date().toISOString()
    };
    
    entries.push(newEntry);
    this.saveToStorage(STORAGE_KEYS.JOURNAL, entries);
    return newEntry;
  }

  async updateJournalEntry(id: string, entry: Partial<JournalEntry>): Promise<JournalEntry> {
    const entries = this.getFromStorage<JournalEntry>(STORAGE_KEYS.JOURNAL);
    const entryIndex = entries.findIndex(e => e.id === id);
    
    if (entryIndex !== -1) {
      entries[entryIndex] = { ...entries[entryIndex], ...entry };
      this.saveToStorage(STORAGE_KEYS.JOURNAL, entries);
      return entries[entryIndex];
    }
    throw new Error('Journal entry not found');
  }

  async deleteJournalEntry(id: string): Promise<void> {
    const entries = this.getFromStorage<JournalEntry>(STORAGE_KEYS.JOURNAL);
    const filteredEntries = entries.filter(e => e.id !== id);
    this.saveToStorage(STORAGE_KEYS.JOURNAL, filteredEntries);
  }

  // Health check
  async healthCheck(): Promise<{ status: string; backend_url: string }> {
    return {
      status: 'healthy',
      backend_url: 'localStorage'
    };
  }
}

export const localApi = new LocalApiService();
