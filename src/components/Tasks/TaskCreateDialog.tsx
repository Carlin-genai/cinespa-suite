
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Save, X, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Task {
  id?: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigned_to: string;
  due_date: string;
  notes?: string;
}

interface TaskCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (task: Partial<Task>) => void;
  isPersonalTask?: boolean;
}

const TaskCreateDialog: React.FC<TaskCreateDialogProps> = ({
  open,
  onOpenChange,
  onSave,
  isPersonalTask = false,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Task['status']>('pending');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');

  // Check if we're in local mode
  const isLocalMode = import.meta.env.VITE_DATA_MODE === 'local' || 
                     import.meta.env.VITE_DATA_MODE === undefined;

  // Get current user ID (handle both Supabase and local mode)
  const currentUserId = isLocalMode ? 'current-user' : user?.id;

  // Fetch users for assignment dropdown (only for admin tasks)
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiService.getUsers(),
    enabled: open && !isPersonalTask && !isLocalMode,
  });

  // Set default assignee for personal tasks
  React.useEffect(() => {
    if (isPersonalTask && currentUserId) {
      setAssignedTo(currentUserId);
    }
  }, [isPersonalTask, currentUserId]);

  const handleSave = () => {
    if (!title || (!isPersonalTask && !assignedTo) || !selectedDate) return;

    // Combine date and time if time is provided
    let dueDateTime = selectedDate;
    if (selectedTime) {
      const [hours, minutes] = selectedTime.split(':');
      dueDateTime = new Date(selectedDate);
      dueDateTime.setHours(parseInt(hours), parseInt(minutes));
    }

    const task: Partial<Task> = {
      title,
      description,
      status,
      priority,
      assigned_to: isPersonalTask ? currentUserId : assignedTo,
      due_date: dueDateTime.toISOString(),
      notes,
    };

    onSave(task);
    handleClose();
  };

  const handleClose = () => {
    // Reset form
    setTitle('');
    setDescription('');
    setStatus('pending');
    setPriority('medium');
    setAssignedTo(isPersonalTask ? currentUserId || '' : '');
    setSelectedDate(undefined);
    setSelectedTime('');
    setNotes('');
    onOpenChange(false);
  };

  const priorityColors = {
    'low': 'text-gray-500',
    'medium': 'text-bronze-gold',
    'high': 'text-luxury-gold',
    'critical': 'text-high-priority'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-montserrat flex items-center gap-2">
            <User className="h-5 w-5 text-luxury-gold" />
            {isPersonalTask ? 'Create Personal Task' : 'Create New Task'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a clear, actionable task title"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Make it specific and actionable (e.g., "Complete client presentation slides")
            </p>
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the task requirements, context, and expected deliverables"
              className="mt-1"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Initial Status</Label>
              <Select value={status} onValueChange={(value: Task['status']) => setStatus(value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending - Not Started</SelectItem>
                  <SelectItem value="in-progress">In Progress - Working On It</SelectItem>
                  <SelectItem value="completed">Completed - Finished</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="priority">Priority Level</Label>
              <Select value={priority} onValueChange={(value: Task['priority']) => setPriority(value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <span className={priorityColors.low}>Low - Can wait</span>
                  </SelectItem>
                  <SelectItem value="medium">
                    <span className={priorityColors.medium}>Medium - Normal priority</span>
                  </SelectItem>
                  <SelectItem value="high">
                    <span className={priorityColors.high}>High - Important</span>
                  </SelectItem>
                  <SelectItem value="critical">
                    <span className={priorityColors.critical}>Critical - Urgent</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isPersonalTask && !isLocalMode && (
            <div>
              <Label htmlFor="assignedTo">Assign To *</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select user to assign" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div>
            <Label>Due Date & Time *</Label>
            <div className="flex gap-2 mt-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
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
              
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-32"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Optional: Set a specific time for better planning
            </p>
          </div>
          
          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional context, resources, or reminders for this task"
              className="mt-1"
              rows={2}
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!title || (!isPersonalTask && !assignedTo) || !selectedDate}
              className="gradient-gold text-charcoal-black"
            >
              <Save className="mr-2 h-4 w-4" />
              Create Task
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskCreateDialog;
