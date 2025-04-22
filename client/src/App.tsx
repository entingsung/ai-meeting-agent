import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Decisions from "@/pages/decisions";
import ActionItems from "@/pages/action-items";
import Notifications from "@/pages/notifications";
import Recordings from "@/pages/recordings";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";

function AppLayout({ children }: { children: React.ReactNode }) {
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    // Fetch unread notifications count
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/notifications/unread-count');
        const data = await response.json();
        setUnreadNotifications(data.count);
      } catch (error) {
        console.error("Failed to fetch unread notifications count", error);
      }
    };

    fetchUnreadCount();
    
    // Set up interval to periodically check for new notifications
    const interval = setInterval(fetchUnreadCount, 30000); // every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar unreadNotifications={unreadNotifications} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          unreadNotifications={unreadNotifications}
          toggleMobileSidebar={toggleMobileSidebar}
        />
        
        <main className="flex-1 overflow-auto bg-gray-50 p-4 md:p-6 pb-16 md:pb-6">
          {children}
        </main>
        
        <MobileNav unreadNotifications={unreadNotifications} />
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Switch>
          <Route path="/">
            {() => (
              <AppLayout>
                <Dashboard />
              </AppLayout>
            )}
          </Route>
          <Route path="/decisions">
            {() => (
              <AppLayout>
                <Decisions />
              </AppLayout>
            )}
          </Route>
          <Route path="/action-items">
            {() => (
              <AppLayout>
                <ActionItems />
              </AppLayout>
            )}
          </Route>
          <Route path="/recordings">
            {() => (
              <AppLayout>
                <Recordings />
              </AppLayout>
            )}
          </Route>
          <Route path="/notifications">
            {() => (
              <AppLayout>
                <Notifications />
              </AppLayout>
            )}
          </Route>
          <Route>
            {() => (
              <AppLayout>
                <NotFound />
              </AppLayout>
            )}
          </Route>
        </Switch>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
