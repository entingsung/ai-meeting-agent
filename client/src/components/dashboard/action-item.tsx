import { useState } from "react";
import { MoreVertical, Calendar, Users, AlertCircle, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ActionItem } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format, isAfter, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ActionItemProps {
  item: ActionItem;
  onComplete: (id: number, completed: boolean) => void;
}

export function ActionItemCard({ item, onComplete }: ActionItemProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingToSlack, setIsSendingToSlack] = useState(false);
  const { toast } = useToast();
  
  const handleCheckboxChange = async (checked: boolean) => {
    setIsLoading(true);
    try {
      const endpoint = checked ? 
        `/api/action-items/${item.id}/complete` : 
        `/api/action-items/${item.id}/uncomplete`;
      
      await apiRequest("POST", endpoint, {});
      onComplete(item.id, checked);
      
      toast({
        title: checked ? "Action item completed" : "Action item reopened",
        description: item.title,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update action item status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const getFormattedDate = () => {
    const date = parseISO(item.dueDate.toString());
    
    if (item.completed && item.completedAt) {
      return `Completed ${format(parseISO(item.completedAt.toString()), 'MMM d, yyyy')}`;
    }
    
    const now = new Date();
    const isOverdue = !item.completed && isAfter(now, date);
    
    if (isOverdue) {
      return `Overdue by ${Math.ceil((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))} days`;
    }
    
    return `Due ${format(date, 'MMM d, yyyy')}`;
  };
  
  const getDateClassName = () => {
    if (item.completed) return "text-gray-500";
    
    const date = parseISO(item.dueDate.toString());
    const now = new Date();
    return isAfter(now, date) ? "text-red-500" : "text-gray-500";
  };
  
  const getPriorityBadge = () => {
    switch (item.priority.toLowerCase()) {
      case 'urgent':
        return <Badge variant="danger">Urgent</Badge>;
      case 'high':
        return <Badge variant="warning">High Priority</Badge>;
      case 'medium':
        return <Badge variant="info">Medium Priority</Badge>;
      case 'low':
        return <Badge variant="success">Low Priority</Badge>;
      default:
        return <Badge variant="gray">{item.priority}</Badge>;
    }
  };
  
  // Send this action item to Slack
  const sendToSlack = async () => {
    setIsSendingToSlack(true);
    
    try {
      await apiRequest("POST", `/api/action-items/${item.id}/send-to-slack`, {});
      
      toast({
        title: "Success!",
        description: "Action item sent to Slack.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send action item to Slack. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingToSlack(false);
    }
  };

  return (
    <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-start">
          <div className="flex-shrink-0 mt-1">
            <Checkbox 
              checked={item.completed} 
              onCheckedChange={handleCheckboxChange}
              disabled={isLoading}
            />
          </div>
          <div className="ml-3">
            <p className={cn(
              "text-sm font-medium",
              item.completed ? "text-gray-500 line-through" : "text-gray-900"
            )}>
              {item.title}
            </p>
            <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-6">
              <div className="mt-2 flex items-center text-sm sm:mt-0">
                <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                <span className={getDateClassName()}>
                  {getFormattedDate()}
                </span>
              </div>
              <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                <Users className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                <span>{item.assignee}</span>
              </div>
            </div>
            <div className="mt-2 space-x-2">
              {getPriorityBadge()}
              {item.decisionId && (
                <Badge variant="indigo">Decision #{item.decisionId}</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="ml-2 flex-shrink-0 flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none">
                <MoreVertical className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={sendToSlack}
                disabled={isSendingToSlack}
                className="cursor-pointer"
              >
                <Send className="h-4 w-4 mr-2" />
                {isSendingToSlack ? "Sending..." : "Send to Slack"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
