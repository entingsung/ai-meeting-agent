import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  extractionRequestSchema, 
  insertDecisionSchema, 
  insertActionItemSchema,
  recordingSchema
} from "@shared/schema";
import { extractDecisionsAndActionItems, transcribeAudio } from "./openai";
import { scheduleActionItemReminder, cancelActionItemReminder, initializeScheduler } from "./scheduler";
import { ZodError } from "zod";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { UploadedFile } from "express-fileupload";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize the scheduler
  initializeScheduler();
  
  // API Routes
  // All routes should be prefixed with /api
  
  // Extract decisions and action items from text
  app.post('/api/extract', async (req: Request, res: Response) => {
    try {
      const { text, source, team } = extractionRequestSchema.parse(req.body);
      
      // Use OpenAI to extract decisions and action items
      const extractionResult = await extractDecisionsAndActionItems(text, source, team);
      
      // Create a decision record
      const decision = await storage.createDecision({
        title: extractionResult.decision.title,
        description: extractionResult.decision.description,
        source,
        team
      });
      
      // Create action items
      const actionItems = await Promise.all(
        extractionResult.actionItems.map(item => {
          const dueDate = new Date(item.dueDate);
          
          return storage.createActionItem({
            title: item.title,
            decisionId: decision.id,
            assignee: item.assignee,
            dueDate,
            priority: item.priority
          }).then(actionItem => {
            // Schedule reminder for this action item
            scheduleActionItemReminder(actionItem.id, dueDate);
            return actionItem;
          });
        })
      );
      
      res.status(201).json({
        decision,
        actionItems
      });
    } catch (error) {
      console.error("Error extracting decisions:", error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: error.message || "Failed to extract decisions and action items" });
    }
  });
  
  // Decision routes
  app.get('/api/decisions', async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const decisions = await storage.listDecisions(limit);
      res.json(decisions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch decisions" });
    }
  });
  
  app.get('/api/decisions/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const decision = await storage.getDecision(id);
      
      if (!decision) {
        return res.status(404).json({ message: "Decision not found" });
      }
      
      // Get action items related to this decision
      const actionItems = await storage.listActionItems({ decisionId: id });
      
      res.json({
        decision,
        actionItems
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch decision details" });
    }
  });
  
  // Action Item routes
  app.get('/api/action-items', async (req: Request, res: Response) => {
    try {
      const filters: { completed?: boolean, decisionId?: number } = {};
      
      if (req.query.completed !== undefined) {
        filters.completed = req.query.completed === 'true';
      }
      
      if (req.query.decisionId) {
        filters.decisionId = parseInt(req.query.decisionId as string);
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const actionItems = await storage.listActionItems(filters, limit);
      res.json(actionItems);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch action items" });
    }
  });
  
  app.post('/api/action-items/:id/complete', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const actionItem = await storage.completeActionItem(id);
      
      if (!actionItem) {
        return res.status(404).json({ message: "Action item not found" });
      }
      
      // Cancel any scheduled reminders
      cancelActionItemReminder(id);
      
      res.json(actionItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to complete action item" });
    }
  });
  
  app.post('/api/action-items/:id/uncomplete', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const actionItem = await storage.getActionItem(id);
      
      if (!actionItem) {
        return res.status(404).json({ message: "Action item not found" });
      }
      
      const updatedItem = await storage.updateActionItem(id, { 
        completed: false,
        completedAt: null
      });
      
      // Reschedule reminders if the due date is in the future
      const dueDate = new Date(actionItem.dueDate);
      if (dueDate > new Date()) {
        scheduleActionItemReminder(id, dueDate);
      }
      
      res.json(updatedItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark action item as not completed" });
    }
  });
  
  // Notification routes
  app.get('/api/notifications', async (req: Request, res: Response) => {
    try {
      const read = req.query.read !== undefined ? req.query.read === 'true' : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      const notifications = await storage.listNotifications(read, limit);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });
  
  app.get('/api/notifications/unread-count', async (req: Request, res: Response) => {
    try {
      const count = await storage.countUnreadNotifications();
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Failed to count unread notifications" });
    }
  });
  
  app.post('/api/notifications/:id/read', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const notification = await storage.markNotificationAsRead(id);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      res.json(notification);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });
  
  // Stats endpoint
  app.get('/api/stats', async (req: Request, res: Response) => {
    try {
      const pendingItems = await storage.listActionItems({ completed: false });
      const completedItems = await storage.listActionItems({ completed: true });
      const decisions = await storage.listDecisions();
      const overdueItems = await storage.getOverdueActionItems();
      
      res.json({
        pendingCount: pendingItems.length,
        completedCount: completedItems.length,
        decisionsCount: decisions.length,
        overdueCount: overdueItems.length
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });
  
  // Recording routes
  app.post('/api/recordings/upload', async (req: Request, res: Response) => {
    try {
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ message: 'No audio file uploaded' });
      }
      
      const audioFile = req.files.audio as UploadedFile;
      const allowedMimeTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-m4a', 'audio/webm'];
      
      if (!allowedMimeTypes.includes(audioFile.mimetype)) {
        return res.status(400).json({ 
          message: 'Invalid file type. Please upload an audio file (MP3, WAV, M4A, or WebM)'
        });
      }
      
      // Generate a unique ID for the recording
      const recordingId = uuidv4();
      const fileExt = path.extname(audioFile.name);
      const fileName = `${recordingId}${fileExt}`;
      const uploadPath = path.join(process.cwd(), 'uploads', fileName);
      
      // Move the file to the uploads directory
      await audioFile.mv(uploadPath);
      
      // Create a new recording entry
      const recording = await storage.createRecording({
        id: recordingId,
        title: req.body.title || audioFile.name,
        status: "pending",
        createdAt: new Date()
      });
      
      // Start transcription process in the background
      transcribeAudio(uploadPath, recordingId).catch(err => {
        console.error('Error during transcription:', err);
      });
      
      res.status(201).json({
        message: 'Audio file uploaded successfully and being processed',
        recording
      });
    } catch (error) {
      console.error('Error uploading audio:', error);
      res.status(500).json({ message: 'Failed to upload audio file' });
    }
  });
  
  app.get('/api/recordings', async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const recordings = await storage.listRecordings(limit);
      res.json(recordings);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch recordings' });
    }
  });
  
  app.get('/api/recordings/:id', async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const recording = await storage.getRecording(id);
      
      if (!recording) {
        return res.status(404).json({ message: 'Recording not found' });
      }
      
      res.json(recording);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch recording details' });
    }
  });
  
  app.post('/api/recordings/:id/extract', async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const { source, team } = extractionRequestSchema.parse(req.body);
      
      const recording = await storage.getRecording(id);
      
      if (!recording) {
        return res.status(404).json({ message: 'Recording not found' });
      }
      
      if (recording.status !== 'completed') {
        return res.status(400).json({ 
          message: 'Recording is not ready for extraction. Current status: ' + recording.status 
        });
      }
      
      if (!recording.transcription) {
        return res.status(400).json({ message: 'Recording does not have a transcription' });
      }
      
      // Use the transcription to extract decisions and action items
      const extractionResult = await extractDecisionsAndActionItems(recording.transcription, source, team);
      
      // Create a decision record
      const decision = await storage.createDecision({
        title: extractionResult.decision.title,
        description: extractionResult.decision.description,
        source,
        team
      });
      
      // Create action items
      const actionItems = await Promise.all(
        extractionResult.actionItems.map(item => {
          const dueDate = new Date(item.dueDate);
          
          return storage.createActionItem({
            title: item.title,
            decisionId: decision.id,
            assignee: item.assignee,
            dueDate,
            priority: item.priority
          }).then(actionItem => {
            // Schedule reminder for this action item
            scheduleActionItemReminder(actionItem.id, dueDate);
            return actionItem;
          });
        })
      );
      
      res.status(201).json({
        decision,
        actionItems
      });
    } catch (error) {
      console.error('Error extracting from recording:', error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: 'Invalid request data', 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: error.message || 'Failed to extract from recording' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
