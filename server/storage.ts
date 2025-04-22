import { 
  users, type User, type InsertUser,
  decisions, type Decision, type InsertDecision,
  actionItems, type ActionItem, type InsertActionItem,
  notifications, type Notification, type InsertNotification,
  type Recording
} from "@shared/schema";

export interface IStorage {
  // User methods (from template)
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Decision methods
  getDecision(id: number): Promise<Decision | undefined>;
  listDecisions(limit?: number): Promise<Decision[]>;
  createDecision(decision: InsertDecision): Promise<Decision>;
  
  // Action Item methods
  getActionItem(id: number): Promise<ActionItem | undefined>;
  listActionItems(filters?: {
    completed?: boolean;
    decisionId?: number;
  }, limit?: number): Promise<ActionItem[]>;
  createActionItem(actionItem: InsertActionItem): Promise<ActionItem>;
  updateActionItem(id: number, updates: Partial<ActionItem>): Promise<ActionItem | undefined>;
  completeActionItem(id: number): Promise<ActionItem | undefined>;
  getOverdueActionItems(): Promise<ActionItem[]>;
  
  // Notification methods
  getNotification(id: number): Promise<Notification | undefined>;
  listNotifications(read?: boolean, limit?: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
  countUnreadNotifications(): Promise<number>;
  
  // Recording methods
  getRecording(id: string): Promise<Recording | undefined>;
  createRecording(recording: Recording): Promise<Recording>;
  updateRecording(id: string, updates: Partial<Recording>): Promise<Recording | undefined>;
  listRecordings(limit?: number): Promise<Recording[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private decisions: Map<number, Decision>;
  private actionItems: Map<number, ActionItem>;
  private notifications: Map<number, Notification>;
  private recordings: Map<string, Recording>;
  private userId: number;
  private decisionId: number;
  private actionItemId: number;
  private notificationId: number;

  constructor() {
    this.users = new Map();
    this.decisions = new Map();
    this.actionItems = new Map();
    this.notifications = new Map();
    this.recordings = new Map();
    this.userId = 1;
    this.decisionId = 1;
    this.actionItemId = 1;
    this.notificationId = 1;
    
    // Create a sample user
    this.createUser({
      username: "alexmorgan",
      password: "password123" // In real app, this would be hashed
    });
    
    // Add some initial data for demo purposes
    this.addSampleData();
  }

  // User methods (from template)
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const createdAt = new Date();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Decision methods
  async getDecision(id: number): Promise<Decision | undefined> {
    return this.decisions.get(id);
  }

  async listDecisions(limit?: number): Promise<Decision[]> {
    const decisions = Array.from(this.decisions.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return limit ? decisions.slice(0, limit) : decisions;
  }

  async createDecision(insertDecision: InsertDecision): Promise<Decision> {
    const id = this.decisionId++;
    const createdAt = new Date();
    const decision: Decision = { ...insertDecision, id, createdAt };
    this.decisions.set(id, decision);
    return decision;
  }

  // Action Item methods
  async getActionItem(id: number): Promise<ActionItem | undefined> {
    return this.actionItems.get(id);
  }

  async listActionItems(filters?: {
    completed?: boolean;
    decisionId?: number;
  }, limit?: number): Promise<ActionItem[]> {
    let actionItems = Array.from(this.actionItems.values());
    
    if (filters) {
      if (filters.completed !== undefined) {
        actionItems = actionItems.filter(item => item.completed === filters.completed);
      }
      
      if (filters.decisionId !== undefined) {
        actionItems = actionItems.filter(item => item.decisionId === filters.decisionId);
      }
    }
    
    // Sort by due date (ascending)
    actionItems.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    
    return limit ? actionItems.slice(0, limit) : actionItems;
  }

  async createActionItem(insertActionItem: InsertActionItem): Promise<ActionItem> {
    const id = this.actionItemId++;
    const createdAt = new Date();
    const actionItem: ActionItem = { 
      ...insertActionItem, 
      id, 
      createdAt,
      completed: false,
      completedAt: null
    };
    this.actionItems.set(id, actionItem);
    
    // Create a notification for the new action item
    this.createNotification({
      type: 'new_assignment',
      actionItemId: id,
      message: `New action item assigned: ${actionItem.title}`
    });
    
    return actionItem;
  }

  async updateActionItem(id: number, updates: Partial<ActionItem>): Promise<ActionItem | undefined> {
    const actionItem = this.actionItems.get(id);
    if (!actionItem) return undefined;
    
    const updatedItem = { ...actionItem, ...updates };
    this.actionItems.set(id, updatedItem);
    return updatedItem;
  }

  async completeActionItem(id: number): Promise<ActionItem | undefined> {
    const actionItem = this.actionItems.get(id);
    if (!actionItem) return undefined;
    
    const updatedItem = { 
      ...actionItem, 
      completed: true, 
      completedAt: new Date() 
    };
    this.actionItems.set(id, updatedItem);
    
    // Create a notification for completion
    this.createNotification({
      type: 'item_completed',
      actionItemId: id,
      message: `Action item completed: ${actionItem.title}`
    });
    
    return updatedItem;
  }
  
  async getOverdueActionItems(): Promise<ActionItem[]> {
    const now = new Date();
    return Array.from(this.actionItems.values())
      .filter(item => !item.completed && new Date(item.dueDate) < now);
  }

  // Notification methods
  async getNotification(id: number): Promise<Notification | undefined> {
    return this.notifications.get(id);
  }

  async listNotifications(read?: boolean, limit?: number): Promise<Notification[]> {
    let notifications = Array.from(this.notifications.values());
    
    if (read !== undefined) {
      notifications = notifications.filter(notification => notification.read === read);
    }
    
    // Sort by creation date (newest first)
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return limit ? notifications.slice(0, limit) : notifications;
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = this.notificationId++;
    const createdAt = new Date();
    const notification: Notification = { 
      ...insertNotification, 
      id, 
      createdAt,
      read: false 
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const notification = this.notifications.get(id);
    if (!notification) return undefined;
    
    const updatedNotification = { ...notification, read: true };
    this.notifications.set(id, updatedNotification);
    return updatedNotification;
  }
  
  async countUnreadNotifications(): Promise<number> {
    return (await this.listNotifications(false)).length;
  }

  // Recording methods
  async getRecording(id: string): Promise<Recording | undefined> {
    return this.recordings.get(id);
  }

  async createRecording(recording: Recording): Promise<Recording> {
    if (!recording.createdAt) {
      recording.createdAt = new Date();
    }
    this.recordings.set(recording.id, recording);
    return recording;
  }

  async updateRecording(id: string, updates: Partial<Recording>): Promise<Recording | undefined> {
    const recording = this.recordings.get(id);
    if (!recording) return undefined;
    
    const updatedRecording = { ...recording, ...updates };
    this.recordings.set(id, updatedRecording);
    return updatedRecording;
  }

  async listRecordings(limit?: number): Promise<Recording[]> {
    const recordings = Array.from(this.recordings.values())
      .sort((a, b) => {
        const dateA = a.createdAt || new Date(0);
        const dateB = b.createdAt || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
    
    return limit ? recordings.slice(0, limit) : recordings;
  }

  // Add sample data for demo purposes
  private addSampleData() {
    // Add sample decisions
    const decision1 = this.createDecision({
      title: "Marketing Campaign Strategy for Q3",
      description: "We decided to focus on digital channels and increase social media budget by 20% for the upcoming quarter.",
      source: "Meeting Notes",
      team: "Marketing Team"
    });

    const decision2 = this.createDecision({
      title: "Product Feature Prioritization",
      description: "Mobile responsive redesign will take priority over new analytics dashboard based on customer feedback and usage metrics.",
      source: "Email",
      team: "Product Team"
    });

    const decision3 = this.createDecision({
      title: "Hiring Plan for Engineering Team",
      description: "Agreed to hire 2 frontend developers and 1 DevOps engineer in the next quarter to support product roadmap execution.",
      source: "Meeting Notes",
      team: "HR & Engineering"
    });

    // Add sample action items
    this.createActionItem({
      title: "Schedule meeting with design team about new dashboard",
      decisionId: 1,
      assignee: "You",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      priority: "High"
    });

    this.createActionItem({
      title: "Finalize Q2 budget approval process",
      decisionId: 1,
      assignee: "You",
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago (overdue)
      priority: "Urgent"
    });

    this.createActionItem({
      title: "Review product launch timeline with engineering",
      decisionId: 2,
      assignee: "You",
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
      priority: "Medium"
    });

    this.createActionItem({
      title: "Prepare sales team for new feature rollout",
      decisionId: 2,
      assignee: "Sarah Johnson",
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      priority: "Medium"
    });

    // Add a completed action item
    const completedItem = this.createActionItem({
      title: "Schedule team retrospective for sprint 24",
      decisionId: 3,
      assignee: "You",
      dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      priority: "Medium"
    });
    
    // Then mark it as completed
    this.completeActionItem(5);
  }
}

export const storage = new MemStorage();
