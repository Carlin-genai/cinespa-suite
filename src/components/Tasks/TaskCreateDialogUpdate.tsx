import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Save, X, Clock, User, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import TeamSelector from '@/components/Teams/TeamSelector';

interface Task {
  id?: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  priority: 'Low' | 'Medium' | 'High';
  assigned_to: string;
  due_date: string;
  time_limit?: number;
  credit_points?: number;
  attachment_url?: string;
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

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    assigned_to: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High',
    time_limit: '', // in minutes
    credit_points: '',
    attachment_url: '',
    notes: ''
  });

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  // Fetch employees from Supabase profiles
  const { data: employees = [], isLoading: loadingEmployees, error: employeeError } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, team_id, is_team_head')
          .order('full_name', { ascending: true });
        
        if (error) throw error;
        
        return (data || []).map((e: any) => ({
          id: e.id,
          email: e.email,
          name: e.full_name || e.email,
          teamId: e.team_id,
          isTeamHead: e.is_team_head
        }));
      } catch (error) {
        console.error('Employee fetch error:', error);
        throw error;
      }
    },
    enabled: open && (!isPersonalTask || showEmployeeSelection),
    retry: 1,
  });

  const handleSave = async () => {
    // Validation
    if (!formData.title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a task title.",
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

    // Combine date and time
    let dueDateTime = selectedDate;
    if (selectedTime) {
      const [hours, minutes] = selectedTime.split(':');
      dueDateTime = new Date(selectedDate);
      dueDateTime.setHours(parseInt(hours), parseInt(minutes));
    }

    const selectedEmployee = employees.find((u: any) => u.email === formData.assigned_to || u.id === formData.assigned_to);
    const assignedUserId = isPersonalTask ? user?.id : (selectedEmployee?.id || formData.assigned_to);

    const taskData = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      priority: formData.priority,
      assigned_to: assignedUserId,
      assigned_by: user?.id,
      due_date: dueDateTime.toISOString(),
      time_limit: formData.time_limit ? parseInt(formData.time_limit) : null,
      credit_points: formData.credit_points ? parseInt(formData.credit_points) : 0,
      attachment_url: formData.attachment_url,
      notes: formData.notes.trim(),
      ...(showEmployeeSelection && { assignedEmployees: selectedEmployees }),
    };

    try {
      await onSave(taskData);
      handleClose();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      due_date: '',
      assigned_to: '',
      priority: 'Medium',
      time_limit: '',
      credit_points: '',
      attachment_url: '',
      notes: ''
    });
    setSelectedDate(undefined);
    setSelectedTime('');
    setSelectedEmployees([]);
    onOpenChange(false);
  };

  const priorityColors = {
    'Low': 'text-green-600',
    'Medium': 'text-blue-600',
    'High': 'text-purple-600'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {isPersonalTask ? 'Create Self Task' : 'Create New Task'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter task title"
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Task description"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priority Level</Label>
              <Select value={formData.priority} onValueChange={(value: 'Low' | 'Medium' | 'High') => 
                setFormData(prev => ({ ...prev, priority: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">
                    <span className={priorityColors.Low}>Low Priority</span>
                  </SelectItem>
                  <SelectItem value="Medium">
                    <span className={priorityColors.Medium}>Medium Priority</span>
                  </SelectItem>
                  <SelectItem value="High">
                    <span className={priorityColors.High}>High Priority</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="credit_points">Credit Points</Label>
              <Input
                id="credit_points"
                type="number"
                min="0"
                value={formData.credit_points}
                onChange={(e) => setFormData(prev => ({ ...prev, credit_points: e.target.value }))}
                placeholder="Points for completion"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="time_limit">Time Limit (minutes)</Label>
            <Input
              id="time_limit"
              type="number"
              min="1"
              value={formData.time_limit}
              onChange={(e) => setFormData(prev => ({ ...prev, time_limit: e.target.value }))}
              placeholder="Expected completion time"
            />
          </div>

          {!isPersonalTask && !showEmployeeSelection && (
            <div>
              <Label htmlFor="assigned_to">Assign to Employee *</Label>
              <Select value={formData.assigned_to} onValueChange={(value) =>
                setFormData(prev => ({ ...prev, assigned_to: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee: any) => (
                    <SelectItem key={employee.id} value={employee.email}>
                      {employee.name} ({employee.email})
                      {employee.isTeamHead && <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-1 rounded">Team Head</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Due Date & Time *</Label>
            <div className="flex gap-2">
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
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick date</span>}
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
          </div>

          <div>
            <Label htmlFor="attachment_url">Attachment URL</Label>
            <Input
              id="attachment_url"
              value={formData.attachment_url}
              onChange={(e) => setFormData(prev => ({ ...prev, attachment_url: e.target.value }))}
              placeholder="Link to relevant documents or resources"
            />
          </div>
          
          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional context or instructions"
              rows={2}
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={handleClose}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Create Task
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskCreateDialog;