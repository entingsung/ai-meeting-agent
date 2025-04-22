import { useQuery } from "@tanstack/react-query";
import { Bell, Check, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function Notifications() {
  const { toast } = useToast();
  
  // Fetch notifications
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['/api/notifications'],
  });
  
  const readNotifications = notifications?.filter(n => n.read) || [];
  const unreadNotifications = notifications?.filter(n => !n.read) || [];
  
  const handleMarkAsRead = async (id: number) => {
    try {
      await apiRequest("POST", `/api/notifications/${id}/read`, {});
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
      
      toast({
        title: "Success",
        description: "Notification marked as read",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    }
  };
  
  const handleMarkAllAsRead = async () => {
    try {
      // For each unread notification, mark as read
      await Promise.all(
        unreadNotifications.map(notification => 
          apiRequest("POST", `/api/notifications/${notification.id}/read`, {})
        )
      );
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
      
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    }
  };
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'action_reminder':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'overdue_reminder':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'new_assignment':
        return <Clock className="h-5 w-5 text-green-500" />;
      case 'item_completed':
        return <Check className="h-5 w-5 text-green-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };
  
  const renderNotification = (notification: any) => {
    return (
      <div 
        key={notification.id}
        className={`p-4 border-b last:border-b-0 ${notification.read ? 'bg-gray-50' : 'bg-white'}`}
      >
        <div className="flex">
          <div className="mr-4 mt-1">
            {getNotificationIcon(notification.type)}
          </div>
          <div className="flex-1">
            <div className="flex justify-between">
              <p className={`text-sm ${notification.read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                {notification.message}
              </p>
              <span className="text-xs text-gray-500">
                {format(parseISO(notification.createdAt.toString()), 'MMM d, h:mm a')}
              </span>
            </div>
            
            {notification.actionItemId && (
              <div className="mt-1">
                <Link href={`/action-items?highlight=${notification.actionItemId}`}>
                  <a className="text-xs text-primary hover:underline">
                    View action item
                  </a>
                </Link>
              </div>
            )}
            
            {!notification.read && (
              <div className="mt-2">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  Mark as read
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
        {unreadNotifications.length > 0 && (
          <Button variant="outline" onClick={handleMarkAllAsRead}>
            Mark all as read
          </Button>
        )}
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <Tabs defaultValue="unread" className="w-full">
          <TabsList className="flex w-full border-b">
            <TabsTrigger 
              value="unread"
              className="flex-1 rounded-none border-b-2 border-transparent px-4 py-2.5 data-[state=active]:border-primary"
            >
              Unread ({unreadNotifications.length})
            </TabsTrigger>
            <TabsTrigger 
              value="all"
              className="flex-1 rounded-none border-b-2 border-transparent px-4 py-2.5 data-[state=active]:border-primary"
            >
              All ({notifications?.length || 0})
            </TabsTrigger>
            <TabsTrigger 
              value="read"
              className="flex-1 rounded-none border-b-2 border-transparent px-4 py-2.5 data-[state=active]:border-primary"
            >
              Read ({readNotifications.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="unread" className="p-0">
            {isLoading ? (
              <div className="p-6 text-center text-gray-500">Loading notifications...</div>
            ) : unreadNotifications.length > 0 ? (
              unreadNotifications.map(renderNotification)
            ) : (
              <div className="p-6 text-center text-gray-500">
                No unread notifications
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="all" className="p-0">
            {isLoading ? (
              <div className="p-6 text-center text-gray-500">Loading notifications...</div>
            ) : notifications?.length > 0 ? (
              notifications.map(renderNotification)
            ) : (
              <div className="p-6 text-center text-gray-500">
                No notifications
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="read" className="p-0">
            {isLoading ? (
              <div className="p-6 text-center text-gray-500">Loading notifications...</div>
            ) : readNotifications.length > 0 ? (
              readNotifications.map(renderNotification)
            ) : (
              <div className="p-6 text-center text-gray-500">
                No read notifications
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
