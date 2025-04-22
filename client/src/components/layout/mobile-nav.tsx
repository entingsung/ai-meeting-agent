import { Link, useLocation } from "wouter";
import { LayoutDashboard, FileText, ClipboardList, Bell, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  unreadNotifications: number;
}

export function MobileNav({ unreadNotifications }: MobileNavProps) {
  const [location] = useLocation();

  const navItems = [
    {
      label: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      active: location === "/"
    },
    {
      label: "Record",
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
      label: "Actions",
      href: "/action-items",
      icon: ClipboardList,
      active: location === "/action-items"
    },
    {
      label: "Alerts",
      href: "/notifications",
      icon: Bell,
      active: location === "/notifications",
      badge: unreadNotifications > 0
    }
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 md:hidden z-10">
      <div className="flex justify-around">
        {navItems.map((item) => (
          <Link 
            key={item.href} 
            href={item.href}
            className={cn(
              "flex flex-col items-center py-3 px-4",
              item.active ? "text-primary" : "text-gray-500"
            )}
          >
            <div className="relative">
              <item.icon className="h-6 w-6" />
              {item.badge && (
                <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
              )}
            </div>
            <span className="text-xs mt-1">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
