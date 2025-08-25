
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabaseApi } from '@/lib/supabaseApi';
import { useToast } from '@/hooks/use-toast';
import { 
  Bell, 
  CheckCheck, 
  Clock, 
  AlertCircle, 
  Calendar,
  Filter,
  MarkAsUnread
} from 'lucide-react';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';

const Notifications = () => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: supabaseApi.getNotifications,
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ['reminders'],
    queryFn: supabaseApi.getReminders,
  });

  const markAsReadMutation = useMutation({
    mutationFn: supabaseApi.markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: 'Notification marked as read' });
    },
  });

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'read') return notification.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const todayNotifications = notifications.filter(n => 
    isToday(new Date(n.created_at))
  );
  const upcomingReminders = reminders.filter(r => 
    new Date(r.reminder_time) > new Date() && !r.is_sent
  );

  const formatNotificationDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return `Today at ${format(date, 'HH:mm')}`;
    if (isYesterday(date)) return `Yesterday at ${format(date, 'HH:mm')}`;
    return format(date, 'MMM dd, yyyy HH:mm');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <CheckCheck className="h-4 w-4" />;
      case 'reminder':
        return <Clock className="h-4 w-4" />;
      case 'deadline':
        return <AlertCircle className="h-4 w-4" />;
      case 'assignment':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'task':
        return 'text-green-500';
      case 'reminder':
        return 'text-blue-500';
      case 'deadline':
        return 'text-red-500';
      case 'assignment':
        return 'text-purple-500';
      default:
        return 'text-luxury-gold';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-luxury-gold"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-8 w-8 text-luxury-gold" />
          <div>
            <h1 className="text-3xl font-bold font-montserrat text-foreground">Notifications</h1>
            <p className="text-muted-foreground font-opensans">
              Stay updated with your tasks and reminders
            </p>
          </div>
        </div>
        
        {unreadCount > 0 && (
          <Badge variant="destructive" className="px-3 py-1">
            {unreadCount} unread
          </Badge>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Notifications</p>
                <p className="text-2xl font-bold">{notifications.length}</p>
              </div>
              <Bell className="h-8 w-8 text-luxury-gold" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Notifications</p>
                <p className="text-2xl font-bold">{todayNotifications.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upcoming Reminders</p>
                <p className="text-2xl font-bold">{upcomingReminders.length}</p>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4">
          {/* Filter Buttons */}
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All ({notifications.length})
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </Button>
            <Button
              variant={filter === 'read' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('read')}
            >
              Read ({notifications.length - unreadCount})
            </Button>
          </div>

          {/* Notifications List */}
          <div className="space-y-2">
            {filteredNotifications.map((notification) => (
              <Card key={notification.id} className={`transition-all duration-200 ${
                !notification.read ? 'border-luxury-gold shadow-md' : 'border-border'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`${getNotificationColor(notification.type)} mt-1`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{notification.title}</h4>
                          <p className="text-sm text-muted-foreground">{notification.message}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!notification.read && (
                            <div className="w-2 h-2 bg-luxury-gold rounded-full"></div>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {notification.type}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {formatNotificationDate(notification.created_at)}
                        </p>
                        
                        {!notification.read && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markAsReadMutation.mutate(notification.id)}
                            className="text-xs"
                          >
                            <CheckCheck className="h-3 w-3 mr-1" />
                            Mark as read
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredNotifications.length === 0 && (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No notifications</h3>
                    <p className="text-muted-foreground">
                      {filter === 'unread' ? "You're all caught up!" : 
                       filter === 'read' ? "No read notifications" : 
                       "You'll see notifications here when you have them"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-4">
          <div className="space-y-2">
            {reminders.map((reminder) => (
              <Card key={reminder.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Clock className="h-5 w-5 text-blue-500 mt-1" />
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{reminder.message}</h4>
                          <p className="text-sm text-muted-foreground">
                            {reminder.task_id && `Task reminder`}
                          </p>
                        </div>
                        <Badge variant={reminder.is_sent ? 'default' : 'outline'}>
                          {reminder.is_sent ? 'Sent' : 'Pending'}
                        </Badge>
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        Scheduled for: {format(new Date(reminder.reminder_time), 'PPpp')}
                        {new Date(reminder.reminder_time) > new Date() && (
                          <span className="ml-2 text-blue-600">
                            ({formatDistanceToNow(new Date(reminder.reminder_time), { addSuffix: true })})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {reminders.length === 0 && (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No reminders set</h3>
                    <p className="text-muted-foreground">
                      Set reminders for your tasks to stay on track
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Notifications;
