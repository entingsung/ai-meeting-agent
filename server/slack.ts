import { WebClient } from "@slack/web-api";
import { ActionItem } from "@shared/schema";

// Slack integration configuration
// SLACK_ENABLED can be set to "true" to enable real Slack integration with proper tokens
const SLACK_ENABLED = process.env.SLACK_ENABLED === "true";

// Initialize Slack client with bot token
let slack: WebClient | null = null;
let channelId: string | null = null;
// Track whether we're using mock or real Slack
let usingMockSlack = true;

if (SLACK_ENABLED) {
  try {
    if (!process.env.SLACK_BOT_TOKEN) {
      console.warn("SLACK_BOT_TOKEN environment variable is not set. Using mock Slack integration.");
    } else if (!process.env.SLACK_CHANNEL_ID) {
      console.warn("SLACK_CHANNEL_ID environment variable is not set. Using mock Slack integration.");
    } else {
      // Only initialize the Slack client if both token and channel ID are available
      slack = new WebClient(process.env.SLACK_BOT_TOKEN);
      channelId = process.env.SLACK_CHANNEL_ID;
      usingMockSlack = false;
      console.log("Real Slack integration initialized successfully.");
    }
  } catch (error) {
    console.error("Failed to initialize Slack client:", error);
    console.log("Falling back to mock Slack integration.");
  }
} else {
  console.log("Slack integration is disabled. Using mock Slack instead.");
}

/**
 * Send an action item to Slack
 * @param actionItem Action item to send to Slack
 * @returns Promise resolving to the sent message's timestamp
 */
export async function sendActionItemToSlack(actionItem: ActionItem): Promise<string | undefined> {
  try {
    // Format due date for logging/display
    const dueDate = new Date(actionItem.dueDate);
    const formattedDueDate = dueDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // If we're using mock Slack, log the message and return a fake timestamp
    if (usingMockSlack) {
      console.log("MOCK SLACK: Sending action item to Slack");
      console.log(`MOCK SLACK: Title: ${actionItem.title}`);
      console.log(`MOCK SLACK: Assignee: ${actionItem.assignee}`);
      console.log(`MOCK SLACK: Due Date: ${formattedDueDate}`);
      console.log(`MOCK SLACK: Priority: ${actionItem.priority}`);
      console.log(`MOCK SLACK: Status: ${actionItem.completed ? "Completed" : "Pending"}`);
      
      // Return a mock timestamp
      return `mock-${Date.now()}`;
    }
    
    // Real Slack implementation
    if (!slack || !channelId) {
      const errorMessage = "Slack integration is not configured. Please set SLACK_BOT_TOKEN and SLACK_CHANNEL_ID environment variables.";
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    // Create slack message with action item details
    const response = await slack.chat.postMessage({
      channel: channelId,
      text: `Action Item: ${actionItem.title} - Assigned to ${actionItem.assignee} - Due on ${formattedDueDate}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "📋 New Action Item",
            emoji: true
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${actionItem.title}*`
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Assignee:*\n${actionItem.assignee}`
            },
            {
              type: "mrkdwn",
              text: `*Due Date:*\n${formattedDueDate}`
            },
            {
              type: "mrkdwn",
              text: `*Priority:*\n${actionItem.priority}`
            },
            {
              type: "mrkdwn",
              text: `*Status:*\n${actionItem.completed ? "✅ Completed" : "⏳ Pending"}`
            }
          ]
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `Created on ${new Date(actionItem.createdAt).toLocaleDateString()}`
            }
          ]
        },
        {
          type: "divider"
        }
      ]
    });

    return response.ts;
  } catch (error) {
    console.error('Error sending Slack message:', error);
    throw error;
  }
}

/**
 * Send a batch of action items to Slack
 * @param actionItems Array of action items to send to Slack
 * @returns Promise resolving to void
 */
export async function sendActionItemsToSlack(actionItems: ActionItem[]): Promise<void> {
  try {
    // If we're using mock Slack, log the info and return
    if (usingMockSlack) {
      console.log(`MOCK SLACK: Sending ${actionItems.length} action items to Slack`);
      console.log(`MOCK SLACK: Time: ${new Date().toLocaleString()}`);
      
      // Log each action item
      for (const actionItem of actionItems) {
        await sendActionItemToSlack(actionItem);
      }
      
      return;
    }
    
    // Real Slack implementation
    if (!slack || !channelId) {
      const errorMessage = "Slack integration is not configured. Please set SLACK_BOT_TOKEN and SLACK_CHANNEL_ID environment variables.";
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    // First, send a header message
    await slack.chat.postMessage({
      channel: channelId,
      text: `Action Items (${actionItems.length}) from your meeting`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `📝 Action Items (${actionItems.length})`,
            emoji: true
          }
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `*${new Date().toLocaleString()}* - Action items from your meeting`
            }
          ]
        },
        {
          type: "divider"
        }
      ]
    });

    // Then send each action item
    for (const actionItem of actionItems) {
      await sendActionItemToSlack(actionItem);
    }

  } catch (error) {
    console.error('Error sending action items to Slack:', error);
    throw error;
  }
}

/**
 * Check if Slack integration is properly configured and working
 * @returns Promise resolving to an object with the status and message
 */
export async function checkSlackIntegration(): Promise<{ status: 'success' | 'error', message: string }> {
  try {
    // If we're using mock Slack, return success with mock message
    if (usingMockSlack) {
      return {
        status: 'success',
        message: "Using mock Slack integration. Messages will be logged to the console but not sent to a real Slack workspace."
      };
    }
    
    // Real Slack integration checks
    if (!slack || !channelId) {
      return { 
        status: 'error', 
        message: "Slack integration is not configured. Please set SLACK_BOT_TOKEN and SLACK_CHANNEL_ID environment variables."
      };
    }
    
    // Try to get info about the bot to verify the token is valid
    const authInfo = await slack.auth.test();
    
    if (!authInfo.ok) {
      return { 
        status: 'error', 
        message: `Slack integration test failed: ${authInfo.error || 'Unknown error'}`
      };
    }
    
    // Now try to verify the channel exists and the bot has access to it
    try {
      const channelInfo = await slack.conversations.info({ channel: channelId });
      return { 
        status: 'success', 
        message: `Slack integration is working correctly. Connected as ${authInfo.user} to channel ${channelInfo.channel?.name || channelId}.`
      };
    } catch (channelError) {
      // If we get here, the token is valid but the channel is not accessible
      return { 
        status: 'error', 
        message: `Slack token is valid, but the channel ${channelId} is not accessible. Error: ${channelError.data?.error || 'Unknown error'}`
      };
    }
  } catch (error) {
    return { 
      status: 'error', 
      message: `Slack integration error: ${error.message || 'Unknown error'}`
    };
  }
}

/**
 * Send a notification to Slack when an action item is completed
 * @param actionItem The completed action item
 * @returns Promise resolving to void
 */
export async function sendActionItemCompletedToSlack(actionItem: ActionItem): Promise<void> {
  try {
    // If we're using mock Slack, log the completion and return
    if (usingMockSlack) {
      console.log("MOCK SLACK: Action item completed notification");
      console.log(`MOCK SLACK: Title: "${actionItem.title}" completed by ${actionItem.assignee}`);
      return;
    }
    
    // Real Slack implementation
    if (!slack || !channelId) {
      const errorMessage = "Slack integration is not configured. Please set SLACK_BOT_TOKEN and SLACK_CHANNEL_ID environment variables.";
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    await slack.chat.postMessage({
      channel: channelId,
      text: `Action Item Completed: "${actionItem.title}" by ${actionItem.assignee}`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `✅ *Action Item Completed*\n"${actionItem.title}" by ${actionItem.assignee}`
          }
        }
      ]
    });
  } catch (error) {
    console.error('Error sending completion notification to Slack:', error);
    throw error;
  }
}