import { WebClient } from "@slack/web-api";
import { ActionItem } from "@shared/schema";

// Initialize Slack client with bot token
if (!process.env.SLACK_BOT_TOKEN) {
  throw new Error("SLACK_BOT_TOKEN environment variable must be set");
}

if (!process.env.SLACK_CHANNEL_ID) {
  throw new Error("SLACK_CHANNEL_ID environment variable must be set");
}

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const channelId = process.env.SLACK_CHANNEL_ID;

/**
 * Send an action item to Slack
 * @param actionItem Action item to send to Slack
 * @returns Promise resolving to the sent message's timestamp
 */
export async function sendActionItemToSlack(actionItem: ActionItem): Promise<string | undefined> {
  try {
    // Format due date
    const dueDate = new Date(actionItem.dueDate);
    const formattedDueDate = dueDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

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
 * Send a notification to Slack when an action item is completed
 * @param actionItem The completed action item
 * @returns Promise resolving to void
 */
export async function sendActionItemCompletedToSlack(actionItem: ActionItem): Promise<void> {
  try {
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