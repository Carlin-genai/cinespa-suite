
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  BookOpen,
  BarChart3,
  Calendar,
  Settings,
  Bell,
  User,
  LogOut
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'My Tasks', href: '/my-tasks', icon: CheckSquare },
  { name: 'Team Tasks', href: '/team-tasks', icon: Users },
  { name: 'Daily Journal', href: '/daily-journal', icon: BookOpen },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const Sidebar = () => {
  const location = useLocation();

  return (
    <div className="flex h-screen w-64 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo/Brand */}
      <div className="flex h-16 items-center justify-center border-b border-sidebar-border px-6">
        <div className="text-center">
          <h1 className="font-montserrat text-xl font-bold text-sidebar-primary">
            CINESPA
          </h1>
          <p className="text-xs text-sidebar-foreground font-opensans">
            LUXURY HOME THEATRES
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg animate-gold-glow'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 transition-colors',
                  isActive ? 'text-sidebar-primary-foreground' : 'text-sidebar-foreground'
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-full bg-sidebar-primary flex items-center justify-center">
            <User className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              Admin User
            </p>
            <p className="text-xs text-sidebar-foreground/70 truncate">
              Project Manager
            </p>
          </div>
          <button className="p-1 rounded-md hover:bg-sidebar-accent transition-colors">
            <LogOut className="h-4 w-4 text-sidebar-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
