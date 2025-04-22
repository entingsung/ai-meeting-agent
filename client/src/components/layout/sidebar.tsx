import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  FileText, 
  ClipboardList, 
  Bell, 
  Settings,
  Check,
  Mic
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  unreadNotifications: number;
}

export function Sidebar({ unreadNotifications }: SidebarProps) {
  const [location] = useLocation();

  const navItems = [
    {
      label: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      active: location === "/"
    },
    {
      label: "Recordings",
      href: "/recordings",
      icon: Mic,
      active: location === "/recordings"
    },
    {
      label: "Decisions",
      href: "/decisions",
      icon: FileText,
      active: location === "/decisions"
    },
    {
      label: "Action Items",
      href: "/action-items",
      icon: ClipboardList,
      active: location === "/action-items"
    },
    {
      label: "Notifications",
      href: "/notifications",
      icon: Bell,
      active: location === "/notifications",
      badge: unreadNotifications > 0 ? unreadNotifications : undefined
    },
    {
      label: "Settings",
      href: "/settings",
      icon: Settings,
      active: location === "/settings"
    }
  ];

  return (
    <aside className="bg-white shadow-md w-64 flex-shrink-0 hidden md:flex md:flex-col h-screen">
      <div className="p-4 border-b">
        <div className="flex items-center">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-white mr-3">
            <Check className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold">ActionTrack</h1>
        </div>
      </div>
      <nav className="p-4 flex-1">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link 
                href={item.href}
                className={cn(
                  "flex items-center px-4 py-2 rounded-md font-medium",
                  item.active
                    ? "text-primary bg-primary-50"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.label}
                {item.badge !== undefined && (
                  <span className="ml-auto bg-primary text-white text-xs px-2 py-1 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t">
        <div className="flex items-center">
          <img 
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" 
            alt="User profile" 
            className="w-8 h-8 rounded-full mr-3"
          />
          <div>
            <p className="text-sm font-medium text-gray-700">Alex Morgan</p>
            <p className="text-xs text-gray-500">Product Manager</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
