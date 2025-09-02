
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
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
  LogOut,
  UserCheck
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'My Tasks', href: '/my-tasks', icon: CheckSquare },
  { name: 'Team Tasks', href: '/team-tasks', icon: Users },
  { name: 'Self Tasks', href: '/self-tasks', icon: UserCheck },
  { name: 'Daily Journal', href: '/daily-journal', icon: BookOpen },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const Sidebar = () => {
  const location = useLocation();
  const { user, profile, signOut } = useAuth();

  return (
    <div className="flex h-screen w-64 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo/Brand */}
      <div className="flex h-16 items-center justify-center border-b border-sidebar-border px-6">
        <div className="text-center">
          <h1 className="font-montserrat text-xl font-bold text-sidebar-primary">
            MARK TECHNOLOGIES
          </h1>
          <p className="text-xs text-sidebar-foreground font-opensans">
            TASK MANAGEMENT & PERFORMANCE TRACKING
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.href === '/'}
            className={({ isActive }) =>
              cn(
                'group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg animate-gold-glow'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )
            }
            onClick={() => console.log(`Navigating to: ${item.href}`)}
          >
            <item.icon
              className="mr-3 h-5 w-5 transition-colors"
            />
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* User Profile */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-full bg-sidebar-primary flex items-center justify-center">
            <User className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.full_name || user?.user_metadata?.full_name || user?.email || 'User'}
            </p>
            <p className="text-xs text-sidebar-foreground/70 truncate capitalize">
              {profile?.role || 'Employee'}
            </p>
          </div>
          <Button 
            onClick={signOut}
            size="sm"
            variant="ghost"
            className="p-1 rounded-md hover:bg-sidebar-accent transition-colors"
          >
            <LogOut className="h-4 w-4 text-sidebar-foreground" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
