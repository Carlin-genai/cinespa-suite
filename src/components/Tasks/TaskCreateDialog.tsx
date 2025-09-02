
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
  const { user, userRole } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Task['status']>('pending');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');

  // Check if we're in local mode or admin
  const isLocalMode = import.meta.env.VITE_DATA_MODE === 'local' || 
                     import.meta.env.VITE_DATA_MODE === undefined;
  const isAdmin = userRole?.role === 'admin';

  // Get current user ID
  const currentUserId = isLocalMode ? 'current-user' : user?.id;

  // Sample employees for local mode
  const localEmployees = [
    { id: 'current-user', name: 'Current User', email: 'user@example.com' },
    { id: 'employee-1', name: 'John Doe', email: 'john@marktech.com' },
    { id: 'employee-2', name: 'Jane Smith', email: 'jane@marktech.com' },
    { id: 'employee-3', name: 'Mike Johnson', email: 'mike@marktech.com' },
    { id: 'employee-4', name: 'Sarah Wilson', email: 'sarah@marktech.com' },
  ];

  // Fetch users for assignment dropdown (only for admin tasks in Supabase mode)
  const { data: supabaseUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiService.getUsers(),
    enabled: open && !isPersonalTask && !isLocalMode && isAdmin,
  });

  // Use local employees in local mode or Supabase users in Supabase mode
  const availableUsers = isLocalMode ? localEmployees : supabaseUsers;

  // Set default assignee for personal tasks
  React.useEffect(() => {
    if (isPersonalTask && currentUserId) {
      setAssignedTo(currentUserId);
    } else if (!isPersonalTask && isLocalMode && availableUsers.length > 0) {
      // For admin tasks in local mode, don't auto-assign
      setAssignedTo('');
    }
  }, [isPersonalTask, currentUserId, isLocalMode, availableUsers]);

  const handleSave = () => {
    // Validation: require title, assignee (for non-personal tasks), and due date
    if (!title) return;
    if (!isPersonalTask && !assignedTo) return;
    if (!selectedDate) return;

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
    'low': 'text-muted-foreground',
    'medium': 'text-rose-gold',
    'high': 'text-rose-gold-contrast',
    'critical': 'text-destructive'
  };

  // Check if form is valid
  const isFormValid = title && (!isPersonalTask ? assignedTo : true) && selectedDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-montserrat flex items-center gap-2 text-rose-gold">
            <User className="h-5 w-5 text-rose-gold" />
            {isPersonalTask ? 'Create Personal Task' : 'Create New Task'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-rose-gold-contrast">Task Title *</Label>
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
            <Label htmlFor="description" className="text-rose-gold-contrast">Description</Label>
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
              <Label htmlFor="status" className="text-rose-gold-contrast">Initial Status</Label>
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
              <Label htmlFor="priority" className="text-rose-gold-contrast">Priority Level</Label>
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

          {!isPersonalTask && (
            <div>
              <Label htmlFor="assignedTo" className="text-rose-gold-contrast">Assign to Employee *</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select employee to assign" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((employee: any) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name} ({employee.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Choose which employee should work on this task
              </p>
            </div>
          )}
          
          <div>
            <Label className="text-rose-gold-contrast">Due Date & Time *</Label>
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
            <Label htmlFor="notes" className="text-rose-gold-contrast">Additional Notes</Label>
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
              disabled={!isFormValid}
              className="bg-rose-gold hover:bg-rose-gold-dark text-white"
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
