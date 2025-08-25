
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Bell, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (reminder: { message: string; reminder_time: string }) => void;
  taskId: string;
  taskTitle: string;
}

const ReminderDialog: React.FC<ReminderDialogProps> = ({
  open,
  onOpenChange,
  onSave,
  taskId,
  taskTitle,
}) => {
  const [message, setMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState('09:00');

  const handleSave = () => {
    if (!selectedDate) return;
    
    const [hours, minutes] = time.split(':').map(Number);
    const reminderDateTime = new Date(selectedDate);
    reminderDateTime.setHours(hours, minutes);
    
    onSave({
      message: message || `Reminder: ${taskTitle}`,
      reminder_time: reminderDateTime.toISOString(),
    });
    
    // Reset form
    setMessage('');
    setSelectedDate(undefined);
    setTime('09:00');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-montserrat flex items-center gap-2">
            <Bell className="h-5 w-5 text-luxury-gold" />
            Set Reminder
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Task</Label>
            <p className="text-sm text-muted-foreground bg-muted p-2 rounded">{taskTitle}</p>
          </div>
          
          <div>
            <Label htmlFor="message">Reminder Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Reminder: ${taskTitle}`}
            />
          </div>
          
          <div>
            <Label>Reminder Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div>
            <Label htmlFor="time">Reminder Time</Label>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!selectedDate} className="gradient-gold text-charcoal-black">
              <Bell className="mr-2 h-4 w-4" />
              Set Reminder
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReminderDialog;
