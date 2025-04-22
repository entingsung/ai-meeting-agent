import { useState } from "react";
import { Menu, Bell, Check } from "lucide-react";
import { Link } from "wouter";

interface HeaderProps {
  unreadNotifications: number;
  toggleMobileSidebar: () => void;
}

export function Header({ unreadNotifications, toggleMobileSidebar }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          <button 
            className="p-1 rounded-md hover:bg-gray-100 md:flex hidden focus:outline-none"
            onClick={toggleMobileSidebar}
          >
            <Menu className="h-6 w-6 text-gray-600" />
          </button>
          <div className="md:hidden">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-white mr-2">
                <Check className="h-5 w-5" />
              </div>
              <h1 className="text-lg font-semibold">ActionTrack</h1>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <button 
              className="p-1 rounded-full hover:bg-gray-100 focus:outline-none" 
              onClick={toggleNotifications}
            >
              <Bell className="h-6 w-6 text-gray-600" />
              {unreadNotifications > 0 && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
            
            {/* Dropdown notification panel */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 z-10 border">
                <div className="px-4 py-2 border-b border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {unreadNotifications > 0 ? (
                    <div className="px-4 py-2 hover:bg-gray-50">
                      <Link href="/notifications">
                        <a className="block">
                          <p className="text-sm font-medium text-gray-900">You have {unreadNotifications} unread notifications</p>
                          <p className="text-xs text-gray-500 mt-1">View all notifications</p>
                        </a>
                      </Link>
                    </div>
                  ) : (
                    <div className="px-4 py-2 text-sm text-gray-500">
                      No new notifications
                    </div>
                  )}
                </div>
                <div className="border-t border-gray-200 px-4 py-2">
                  <Link href="/notifications">
                    <a className="block text-xs text-primary font-medium">View all notifications</a>
                  </Link>
                </div>
              </div>
            )}
          </div>
          <div className="hidden md:block">
            <img 
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" 
              alt="User profile" 
              className="w-8 h-8 rounded-full"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
