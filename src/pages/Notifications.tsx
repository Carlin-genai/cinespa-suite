import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, AlertTriangle, Info, Calendar, Trash2 } from 'lucide-react';
import { apiService } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const Notifications = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch notifications from backend
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiService.getNotifications(),
  });

  // Fetch reminders from backend
  const { data: reminders = [] } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => apiService.getReminders(),
  });

  // Mark notification as read mutation
  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiService.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({
        title: "Success",
        description: "Notification marked as read",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
      console.error('Mark read error:', error);
    },
  });

  const handleMarkAsRead = (id: string) => {
    markReadMutation.mutate(id);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <Calendar className="h-5 w-5 text-progress-blue" />;
      case 'reminder':
        return <Bell className="h-5 w-5 text-rose-gold" />;
      case 'alert':
        return <AlertTriangle className="h-5 w-5 text-overdue-red" />;
      default:
        return <Info className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const unreadNotifications = notifications.filter((n: any) => !n.read);
  const readNotifications = notifications.filter((n: any) => n.read);
  const upcomingReminders = reminders.filter((r: any) => 
    new Date(r.reminder_time) > new Date() && !r.is_sent
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-gold"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-montserrat text-foreground">Notifications</h1>
          <p className="text-muted-foreground font-opensans">
            Stay updated with your tasks and reminders
          </p>
        </div>
        <div className="flex items-center gap-4">
          {unreadNotifications.length > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {unreadNotifications.length} unread
            </Badge>
          )}
        </div>
      </div>

      {/* Upcoming Reminders */}
      {upcomingReminders.length > 0 && (
        <Card className="border-rose-gold/50">
          <CardHeader>
            <CardTitle className="font-montserrat flex items-center gap-2">
              <Bell className="h-5 w-5 text-rose-gold animate-pulse" />
              Upcoming Reminders ({upcomingReminders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingReminders.map((reminder: any) => (
                <div
                  key={reminder.id}
                  className="flex items-center justify-between p-3 bg-rose-gold/10 rounded-lg border border-rose-gold/20"
                >
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{reminder.message}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(reminder.reminder_time).toLocaleString()}
                    </p>
                  </div>
                  <Badge className="bg-rose-gold text-white">
                    Pending
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unread Notifications */}
      {unreadNotifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-montserrat flex items-center gap-2">
              <Bell className="h-5 w-5 text-overdue-red" />
              Unread Notifications ({unreadNotifications.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {unreadNotifications.map((notification: any) => (
                <div
                  key={notification.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold font-opensans text-foreground">
                          {notification.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="border-rose-gold text-rose-gold hover:bg-rose-gold hover:text-white"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Read Notifications */}
      {readNotifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-montserrat flex items-center gap-2 text-muted-foreground">
              <Check className="h-5 w-5" />
              Read Notifications ({readNotifications.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {readNotifications.map((notification: any) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-4 p-4 border rounded-lg opacity-60",
                    "hover:opacity-80 transition-opacity"
                  )}
                >
                  <div className="flex-shrink-0 mt-1 opacity-50">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold font-opensans text-muted-foreground">
                      {notification.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {notifications.length === 0 && reminders.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
              <Bell className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold font-montserrat mb-2">No notifications</h3>
            <p className="text-muted-foreground font-opensans">
              You're all caught up! Notifications will appear here when you have new updates.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Notifications;