import { storage } from "./storage";
import schedule from "node-schedule";

// Map to keep track of scheduled jobs by action item ID
const scheduledJobs: Map<number, schedule.Job> = new Map();

// Schedule follow-up reminders for an action item
export function scheduleActionItemReminder(actionItemId: number, dueDate: Date): void {
  try {
    // Cancel any existing job for this action item
    cancelActionItemReminder(actionItemId);
    
    // Schedule reminders at different intervals
    
    // 1 day before due date
    const oneDayBefore = new Date(dueDate);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);
    
    if (oneDayBefore > new Date()) {
      schedule.scheduleJob(oneDayBefore, async () => {
        const actionItem = await storage.getActionItem(actionItemId);
        
        if (actionItem && !actionItem.completed) {
          await storage.createNotification({
            type: "action_reminder",
            actionItemId: actionItemId,
            message: `Reminder: "${actionItem.title}" is due tomorrow.`
          });
        }
      });
    }
    
    // On due date
    const job = schedule.scheduleJob(dueDate, async () => {
      const actionItem = await storage.getActionItem(actionItemId);
      
      if (actionItem && !actionItem.completed) {
        await storage.createNotification({
          type: "action_reminder",
          actionItemId: actionItemId,
          message: `Due today: "${actionItem.title}" is due today.`
        });
      }
    });
    
    // Save the job reference
    scheduledJobs.set(actionItemId, job);
  } catch (error) {
    console.error(`Error scheduling reminder for action item ${actionItemId}:`, error);
  }
}

// Cancel scheduled reminders for an action item
export function cancelActionItemReminder(actionItemId: number): void {
  const job = scheduledJobs.get(actionItemId);
  
  if (job) {
    job.cancel();
    scheduledJobs.delete(actionItemId);
  }
}

// Schedule daily check for overdue items
export function scheduleOverdueItemsCheck(): schedule.Job {
  // Run every day at midnight
  return schedule.scheduleJob("0 0 * * *", async () => {
    try {
      const overdueItems = await storage.getOverdueActionItems();
      
      for (const item of overdueItems) {
        // Check if we haven't already notified about this overdue item today
        const today = new Date().toDateString();
        
        await storage.createNotification({
          type: "overdue_reminder",
          actionItemId: item.id,
          message: `Overdue: "${item.title}" is past its due date.`
        });
      }
    } catch (error) {
      console.error("Error checking for overdue items:", error);
    }
  });
}

// Initialize scheduler when server starts
export function initializeScheduler(): void {
  // Start the daily overdue items check
  scheduleOverdueItemsCheck();
  
  // Schedule reminders for all existing action items
  storage.listActionItems({ completed: false })
    .then(actionItems => {
      for (const item of actionItems) {
        const dueDate = new Date(item.dueDate);
        
        // Only schedule if the due date is in the future
        if (dueDate > new Date()) {
          scheduleActionItemReminder(item.id, dueDate);
        }
      }
    })
    .catch(error => {
      console.error("Error initializing scheduler:", error);
    });
}
