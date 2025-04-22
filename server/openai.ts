import OpenAI from "openai";
import { AIExtractResponse, aiExtractResponseSchema, Recording } from "@shared/schema";
import fs from "fs";
import { storage } from "./storage";
import path from "path";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "sk-" });

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Transcribes an audio file using OpenAI's Whisper model
 * @param filePath Path to the audio file to transcribe
 * @param recordingId ID of the recording in the database
 * @returns The transcription text
 */
export async function transcribeAudio(filePath: string, recordingId: string): Promise<string> {
  try {
    // Update recording status
    await storage.updateRecording(recordingId, { 
      status: "transcribing" 
    });

    // Read the file as a stream
    const fileStream = fs.createReadStream(filePath);

    // Transcribe using OpenAI's Whisper model
    const transcription = await openai.audio.transcriptions.create({
      file: fileStream,
      model: "whisper-1",
      language: "en",
      response_format: "text"
    });

    // Update recording with transcription
    await storage.updateRecording(recordingId, {
      transcription: transcription,
      status: "completed"
    });

    return transcription;
  } catch (error) {
    console.error("Error transcribing audio:", error);
    
    // Update recording status to failed
    await storage.updateRecording(recordingId, { 
      status: "failed" 
    });
    
    throw new Error("Failed to transcribe audio. Please try again.");
  }
}

export async function extractDecisionsAndActionItems(text: string, source: string, team?: string): Promise<AIExtractResponse> {
  try {
    const prompt = `
    Analyze the following ${source.toLowerCase()} text and extract:
    
    1. The main decision that was made
    2. Any action items that were assigned or should be assigned
    
    Text to analyze:
    ${text}
    
    ${team ? `This is from the ${team} team.` : ''}
    
    Respond with a JSON in the following format:
    {
      "decision": {
        "title": "Brief 1-line title of the decision",
        "description": "Detailed description of the decision"
      },
      "actionItems": [
        {
          "title": "Description of the action item",
          "assignee": "Person assigned to this task, use 'You' if no specific assignee mentioned",
          "dueDate": "ISO date string for when this should be completed (use reasonable defaults, 1-2 weeks out)",
          "priority": "High, Medium, or Low based on urgency"
        }
      ]
    }
    
    Ensure the response is only the JSON object with no explanations before or after.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an AI assistant that extracts decisions and action items from text. Your job is to identify key decisions made and tasks assigned in meetings, emails, and documents."
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    // Validate the response against our schema
    const validated = aiExtractResponseSchema.parse(result);
    
    return validated;
  } catch (error) {
    console.error("Error extracting decisions and action items:", error);
    throw new Error("Failed to analyze text. Please try again.");
  }
}
