import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Clock, Plus, Bell, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

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
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    reminder_time: '',
    type: 'personal' as 'personal' | 'team' | 'reminder'
  });
  const { user } = useAuth();
  const { toast } = useToast();

  const resetForm = () => {
    setEventForm({
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      reminder_time: '',
      type: 'personal'
    });
    setEditingEvent(null);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      description: event.description || '',
      start_time: event.start_time,
      end_time: event.end_time,
      reminder_time: event.reminder_time || '',
      type: event.type
    });
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents(prev => prev.filter(e => e.id !== eventId));
    toast({
      title: "Event Deleted",
      description: "Your calendar event has been deleted successfully",
    });
  };

  const handleCreateEvent = async () => {
    if (!eventForm.title || !eventForm.start_time) {
      toast({
        title: "Missing Information",
        description: "Please fill in the title and start time",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      if (editingEvent) {
        // Update existing event
        const updatedEvent: CalendarEvent = {
          ...editingEvent,
          title: eventForm.title,
          description: eventForm.description,
          start_time: eventForm.start_time,
          end_time: eventForm.end_time || eventForm.start_time, // Make end time optional
          reminder_time: eventForm.reminder_time,
          type: eventForm.type
        };

        setEvents(prev => prev.map(e => e.id === editingEvent.id ? updatedEvent : e));
        
        toast({
          title: "Event Updated",
          description: "Your calendar event has been updated successfully",
        });
      } else {
        // Create new event
        const newEvent: CalendarEvent = {
          id: Date.now().toString(),
          title: eventForm.title,
          description: eventForm.description,
          start_time: eventForm.start_time,
          end_time: eventForm.end_time || eventForm.start_time, // Make end time optional
          reminder_time: eventForm.reminder_time,
          user_id: user?.id || '',
          type: eventForm.type
        };

        setEvents(prev => [...prev, newEvent]);
        
        toast({
          title: "Event Created",
          description: "Your calendar event has been created successfully",
        });
      }
      
      resetForm();
    } catch (error) {
      toast({
        title: "Error",
        description: editingEvent ? "Failed to update event" : "Failed to create event",
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
              {editingEvent ? 'Edit Event' : 'New Event'}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingEvent ? 'Edit Event' : 'Create New Event'}</DialogTitle>
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
                  {isCreating ? (editingEvent ? 'Updating...' : 'Creating...') : (editingEvent ? 'Update Event' : 'Create Event')}
                </Button>
                {editingEvent && (
                  <Button onClick={resetForm} variant="outline" className="w-full">
                    Cancel Edit
                  </Button>
                )}
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
                  <div key={event.id} className="border rounded-lg p-3 group hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">{event.title}</h4>
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(event.start_time).toLocaleTimeString()}
                          {event.end_time && event.end_time !== event.start_time && (
                            <> - {new Date(event.end_time).toLocaleTimeString()}</>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditEvent(event)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Event</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{event.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteEvent(event.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
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
                  <div key={event.id} className="border rounded-lg p-3 group hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
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
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditEvent(event)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Event</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{event.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteEvent(event.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
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