import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Clock, Plus, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  user_id: string;
  reminder_time?: string;
  type: 'personal' | 'team' | 'reminder';
}

const CalendarScheduler: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    reminder_time: '',
    type: 'personal' as const
  });
  const { user } = useAuth();
  const { toast } = useToast();

  const handleCreateEvent = async () => {
    if (!eventForm.title || !eventForm.start_time || !eventForm.end_time) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const newEvent: CalendarEvent = {
        id: Date.now().toString(),
        title: eventForm.title,
        description: eventForm.description,
        start_time: eventForm.start_time,
        end_time: eventForm.end_time,
        reminder_time: eventForm.reminder_time,
        user_id: user?.id || '',
        type: eventForm.type
      };

      setEvents(prev => [...prev, newEvent]);
      
      // Reset form
      setEventForm({
        title: '',
        description: '',
        start_time: '',
        end_time: '',
        reminder_time: '',
        type: 'personal'
      });

      toast({
        title: "Event Created",
        description: "Your calendar event has been created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getTodayEvents = () => {
    const today = new Date().toISOString().split('T')[0];
    return events.filter(event => 
      event.start_time.startsWith(today)
    );
  };

  const getUpcomingEvents = () => {
    const now = new Date();
    return events.filter(event => 
      new Date(event.start_time) > now
    ).slice(0, 5);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Calendar & Scheduling</h2>
          <p className="text-muted-foreground">Manage your personal schedule and reminders</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-rose-gold hover:bg-rose-gold-dark text-white">
              <Plus className="mr-2 h-4 w-4" />
              New Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={eventForm.title}
                  onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Event title"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={eventForm.description}
                  onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Event description (optional)"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="datetime-local"
                    value={eventForm.start_time}
                    onChange={(e) => setEventForm(prev => ({ ...prev, start_time: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="datetime-local"
                    value={eventForm.end_time}
                    onChange={(e) => setEventForm(prev => ({ ...prev, end_time: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="reminder_time">Reminder (Optional)</Label>
                <Input
                  id="reminder_time"
                  type="datetime-local"
                  value={eventForm.reminder_time}
                  onChange={(e) => setEventForm(prev => ({ ...prev, reminder_time: e.target.value }))}
                />
              </div>

              <Button onClick={handleCreateEvent} disabled={isCreating} className="w-full">
                {isCreating ? 'Creating...' : 'Create Event'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Today's Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-rose-gold" />
              Today's Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getTodayEvents().length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No events scheduled for today</p>
            ) : (
              <div className="space-y-3">
                {getTodayEvents().map((event) => (
                  <div key={event.id} className="border rounded-lg p-3">
                    <h4 className="font-medium text-foreground">{event.title}</h4>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(event.start_time).toLocaleTimeString()} - 
                      {new Date(event.end_time).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-rose-gold" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getUpcomingEvents().length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No upcoming events</p>
            ) : (
              <div className="space-y-3">
                {getUpcomingEvents().map((event) => (
                  <div key={event.id} className="border rounded-lg p-3">
                    <h4 className="font-medium text-foreground">{event.title}</h4>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(event.start_time).toLocaleDateString()} at{' '}
                      {new Date(event.start_time).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CalendarScheduler;