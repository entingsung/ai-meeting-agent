import { FileText, Calendar, Users, ClipboardList, Send, MoreVertical } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Decision } from "@shared/schema";
import { Link } from "wouter";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DecisionCardProps {
  decision: Decision;
  actionItemsCount: number;
}

export function DecisionCard({ decision, actionItemsCount }: DecisionCardProps) {
  const [isSendingToSlack, setIsSendingToSlack] = useState(false);
  const { toast } = useToast();
  const formattedDate = format(parseISO(decision.createdAt.toString()), 'MMM d, yyyy');
  
  // Send all action items from this decision to Slack
  const sendActionItemsToSlack = async () => {
    if (actionItemsCount === 0) {
      toast({
        title: "No action items",
        description: "This decision has no action items to send to Slack.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSendingToSlack(true);
    
    try {
      await apiRequest("POST", `/api/decisions/${decision.id}/send-action-items-to-slack`, {});
      
      toast({
        title: "Success!",
        description: `${actionItemsCount} action item(s) from "${decision.title}" sent to Slack.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send action items to Slack. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingToSlack(false);
    }
  };
  
  return (
    <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-gray-900 mb-1">
            <Link href={`/decisions/${decision.id}`} className="hover:text-primary">
              {decision.title}
            </Link>
          </h4>
          <p className="text-sm text-gray-600 mb-2">{decision.description}</p>
          <div className="flex flex-wrap items-center text-xs text-gray-500">
            <span className="flex items-center mr-3">
              <Calendar className="h-3.5 w-3.5 mr-1 text-gray-400" />
              {formattedDate}
            </span>
            <span className="flex items-center mr-3">
              <Users className="h-3.5 w-3.5 mr-1 text-gray-400" />
              {decision.team || "No team specified"}
            </span>
            <span className="flex items-center mr-3">
              <ClipboardList className="h-3.5 w-3.5 mr-1 text-gray-400" />
              {actionItemsCount} Action Item{actionItemsCount !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center mr-3">
              <FileText className="h-3.5 w-3.5 mr-1 text-gray-400" />
              {decision.source}
            </span>
          </div>
        </div>
        
        {actionItemsCount > 0 && (
          <div className="ml-4 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none">
                  <MoreVertical className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={sendActionItemsToSlack}
                  disabled={isSendingToSlack}
                  className="cursor-pointer"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isSendingToSlack ? "Sending..." : "Send Action Items to Slack"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
}
