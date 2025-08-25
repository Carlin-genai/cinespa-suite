
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { supabaseApi } from '@/lib/supabaseApi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  task_id?: string;
}

const Notifications = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: supabaseApi.getNotifications,
  });

  // Fetch reminders
  const { data: reminders = [] } = useQuery({
    queryKey: ['reminders'],
    queryFn: supabaseApi.getReminders,
  });

  // Mark notification as read
  const markReadMutation = useMutation({
    mutationFn: (id: string) => supabaseApi.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const todaysReminders = reminders.filter(r => 
    format(new Date(r.reminder_time), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  );

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <CheckCircle className="h-5 w-5 text-progress-blue" />;
      case 'reminder':
        return <Clock className="h-5 w-5 text-luxury-gold" />;
      case 'alert':
        return <AlertCircle className="h-5 w-5 text-blocked-red" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const handleMarkAsRead = (id: string) => {
    markReadMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-montserrat text-foreground flex items-center gap-3">
            <Bell className="h-8 w-8 text-luxury-gold" />
            Notifications
          </h1>
          <p className="text-muted-foreground font-opensans mt-1">
            Stay updated with your tasks, reminders, and team activities.
          </p>
        </div>
        <Badge variant="outline" className="text-luxury-gold border-luxury-gold">
          {unreadCount} unread
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Bell className="h-8 w-8 text-luxury-gold" />
              <div>
                <div className="text-2xl font-bold font-montserrat text-foreground">
                  {notifications.length}
                </div>
                <p className="text-sm text-muted-foreground">Total Notifications</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-progress-blue" />
              <div>
                <div className="text-2xl font-bold font-montserrat text-foreground">
                  {todaysReminders.length}
                </div>
                <p className="text-sm text-muted-foreground">Today's Reminders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-completed-green" />
              <div>
                <div className="text-2xl font-bold font-montserrat text-foreground">
                  {notifications.filter(n => n.read).length}
                </div>
                <p className="text-sm text-muted-foreground">Read Notifications</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Reminders */}
      {todaysReminders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-montserrat text-foreground flex items-center gap-2">
              <Clock className="h-5 w-5 text-luxury-gold" />
              Today's Reminders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todaysReminders.map((reminder) => (
                <Card key={reminder.id} className="p-4 bg-luxury-gold/5 border-luxury-gold/20">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-luxury-gold mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{reminder.message}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(reminder.reminder_time), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-montserrat text-foreground">
            All Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-luxury-gold mx-auto"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="mx-auto h-12 w-12 mb-4 text-luxury-gold" />
              <p className="font-opensans">No notifications yet</p>
              <p className="text-sm">You'll see notifications here when you have task updates or reminders.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`p-4 transition-colors ${
                    !notification.read 
                      ? 'bg-luxury-gold/5 border-luxury-gold/20' 
                      : 'bg-muted/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-foreground">
                            {notification.title}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(notification.created_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                        {!notification.read && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="border-luxury-gold text-luxury-gold hover:bg-luxury-gold hover:text-charcoal-black"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Notifications;
