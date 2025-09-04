
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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  onSave: (task: Partial<Task> & { assignedEmployees?: string[] }) => void;
  isPersonalTask?: boolean;
  showEmployeeSelection?: boolean;
}

const TaskCreateDialog: React.FC<TaskCreateDialogProps> = ({
  open,
  onOpenChange,
  onSave,
  isPersonalTask = false,
  showEmployeeSelection = false,
}) => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Task['status']>('pending');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch employees from Supabase profiles
  const { data: employees = [], isLoading: loadingEmployees, error: employeeError } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .order('full_name', { ascending: true });
        
        if (error) {
          console.error('Failed to fetch employees:', error);
          throw error;
        }
        
        return (data || []).map((e: any) => ({
          id: e.id,
          email: e.email,
          name: e.full_name || e.email,
        }));
      } catch (error) {
        console.error('Employee fetch error:', error);
        throw error;
      }
    },
    enabled: open && (!isPersonalTask || showEmployeeSelection),
    retry: 1,
  });

  // Show loading or error state for employees
  React.useEffect(() => {
    if (employeeError && open && (!isPersonalTask || showEmployeeSelection)) {
      toast({
        title: "Error loading employees",
        description: "Failed to load employee list. Please try again.",
        variant: "destructive"
      });
    }
  }, [employeeError, open, isPersonalTask, showEmployeeSelection, toast]);

  // Use fetched employees
  const availableUsers = employees;

  // Set default assignee for personal tasks
  React.useEffect(() => {
    if (isPersonalTask) {
      setAssignedTo('personal');
    } else {
      // For admin tasks, don't auto-assign
      setAssignedTo('');
    }
    // Reset selected employees when switching modes
    setSelectedEmployees([]);
  }, [isPersonalTask, showEmployeeSelection, availableUsers]);

  const handleSave = async () => {
    // Validation with user feedback
    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a task title.",
        variant: "destructive"
      });
      return;
    }
    
    if (!isPersonalTask && !showEmployeeSelection && !assignedTo) {
      toast({
        title: "Assignment Required",
        description: "Please select an employee to assign this task to.",
        variant: "destructive"
      });
      return;
    }

    if (showEmployeeSelection && selectedEmployees.length === 0) {
      toast({
        title: "Team Members Required",
        description: "Please select at least one employee for this team task.",
        variant: "destructive"
      });
      return;
    }
    
    if (!selectedDate) {
      toast({
        title: "Due Date Required", 
        description: "Please select a due date for this task.",
        variant: "destructive"
      });
      return;
    }

    // Combine date and time if time is provided
    let dueDateTime = selectedDate;
    if (selectedTime) {
      const [hours, minutes] = selectedTime.split(':');
      dueDateTime = new Date(selectedDate);
      dueDateTime.setHours(parseInt(hours), parseInt(minutes));
    }

    // Get selected employee for assignment
    const selectedEmployee = availableUsers.find((u: any) => u.email === assignedTo || u.id === assignedTo);
    const assignedUserId = isPersonalTask ? user?.id : (selectedEmployee?.id || assignedTo);

    const taskData = {
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      assigned_to: assignedUserId,
      assigned_by: user?.id, // Current user is always the assigner
      due_date: dueDateTime.toISOString(),
      notes: notes.trim(),
      ...(showEmployeeSelection && { assignedEmployees: selectedEmployees }),
    };

    try {
      console.log('[TaskCreate] Creating task with Supabase API', taskData);
      await onSave(taskData);
      
      // Show success message
      toast({
        title: "Task Created Successfully!",
        description: showEmployeeSelection 
          ? `Team task "${title}" has been assigned to ${selectedEmployees.length} employee${selectedEmployees.length > 1 ? 's' : ''}.`
          : `Task "${title}" has been created and assigned${!isPersonalTask ? ` to ${selectedEmployee?.name || assignedUserId}` : ''}.`,
      });
      
      handleClose();
    } catch (error) {
      console.error('[TaskCreate] Error creating task:', error);
      toast({
        title: "Error Creating Task",
        description: "There was an error creating the task. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleClose = () => {
    // Reset form
    setTitle('');
    setDescription('');
    setStatus('pending');
    setPriority('medium');
    setAssignedTo(isPersonalTask ? 'personal' : '');
    setSelectedEmployees([]);
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
  const isFormValid = title && 
    (!isPersonalTask && !showEmployeeSelection ? assignedTo : true) && 
    (!showEmployeeSelection || selectedEmployees.length > 0) &&
    selectedDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="font-montserrat flex items-center gap-2 text-rose-gold">
            <User className="h-5 w-5 text-rose-gold" />
            {isPersonalTask ? 'Create Personal Task' : 'Create New Task'}
          </DialogTitle>
        </DialogHeader>
        
        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-6 space-y-4">
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
                <SelectContent className="z-50 bg-background">
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
                <SelectContent className="z-50 bg-background">
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

          {(!isPersonalTask && !showEmployeeSelection) && (
            <div>
              <Label htmlFor="assignedTo" className="text-rose-gold-contrast">Assign to Employee *</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={
                    loadingEmployees ? "Loading employees..." : 
                    availableUsers.length === 0 ? "No employees found" :
                    "Select employee to assign"
                  } />
                </SelectTrigger>
                <SelectContent className="z-50 bg-background border shadow-md">
                  {loadingEmployees ? (
                    <SelectItem value="loading" disabled>
                      Loading employees...
                    </SelectItem>
                  ) : availableUsers.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No employees available
                    </SelectItem>
                  ) : (
                    availableUsers.map((employee: any) => (
                      <SelectItem key={employee.email} value={employee.email}>
                        {employee.name} ({employee.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {loadingEmployees 
                  ? "Loading employee list from database..." 
                  : `Choose which employee should work on this task (${availableUsers.length} available)`
                }
              </p>
              {employeeError && (
                <p className="text-xs text-destructive mt-1">
                  Failed to load employees. Please refresh and try again.
                </p>
              )}
            </div>
          )}

          {showEmployeeSelection && (
            <div>
              <Label className="text-rose-gold-contrast">Select Team Members * ({selectedEmployees.length} selected)</Label>
              {loadingEmployees ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-rose-gold mx-auto"></div>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto border rounded-lg p-4 space-y-3 mt-1">
                  {availableUsers.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No employees available
                    </p>
                  ) : (
                    availableUsers.map((employee: any) => (
                      <div key={employee.id} className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id={`employee-${employee.id}`}
                          checked={selectedEmployees.includes(employee.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEmployees(prev => [...prev, employee.id]);
                            } else {
                              setSelectedEmployees(prev => prev.filter(id => id !== employee.id));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <Label
                          htmlFor={`employee-${employee.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div>
                            <div className="font-medium">{employee.name}</div>
                            <div className="text-sm text-muted-foreground">{employee.email}</div>
                          </div>
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Select multiple employees to assign this team task to all of them
              </p>
              {employeeError && (
                <p className="text-xs text-destructive mt-1">
                  Failed to load employees. Please refresh and try again.
                </p>
              )}
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
                    className={cn("p-3 pointer-events-auto")}
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
        </div>
        
        {/* Sticky footer */}
        <div className="flex-shrink-0 flex justify-end gap-2 p-6 border-t bg-background">
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
      </DialogContent>
    </Dialog>
  );
};

export default TaskCreateDialog;
