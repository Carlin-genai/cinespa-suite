import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Save, User, Users } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Task } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AdminTaskDetailsDialogProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
}

const AdminTaskDetailsDialog: React.FC<AdminTaskDetailsDialogProps> = ({
  task,
  isOpen,
  onClose,
  onSave,
}) => {
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Fetch assignee profile
  const { data: assigneeProfile } = useQuery({
    queryKey: ['profile', task?.assigned_to],
    queryFn: async () => {
      if (!task?.assigned_to) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', task.assigned_to)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!task?.assigned_to && isOpen,
  });

  // Fetch team info if it's a team task
  const { data: teamInfo } = useQuery({
    queryKey: ['team', task?.team_id],
    queryFn: async () => {
      if (!task?.team_id) return null;
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('id', task.team_id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!task?.team_id && isOpen,
  });

  useEffect(() => {
    if (task) {
      setEditedTask({ ...task });
      setSelectedDate(task.due_date ? new Date(task.due_date) : undefined);
    }
  }, [task]);

  if (!editedTask || !task) return null;

  const handleSave = () => {
    if (selectedDate) {
      editedTask.due_date = selectedDate.toISOString();
    }
    onSave(editedTask);
    onClose();
  };

  const getAssignedToDisplay = () => {
    if (task.team_id && teamInfo) {
      return `Team: ${teamInfo.name}`;
    }
    if (assigneeProfile) {
      return assigneeProfile.full_name || assigneeProfile.email;
    }
    return 'Loading...';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {task.team_id ? <Users className="h-5 w-5" /> : <User className="h-5 w-5" />}
            Task Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={editedTask.title}
              onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={editedTask.description || ''}
              onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label>Assigned To</Label>
            <div className="p-2 bg-muted rounded-md text-sm">
              {getAssignedToDisplay()}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={editedTask.status} onValueChange={(value: any) => setEditedTask({ ...editedTask, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={editedTask.priority} onValueChange={(value: any) => setEditedTask({ ...editedTask, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Due Date</Label>
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

          {task.task_type !== 'self' && (
            <div>
              <Label htmlFor="credit_points">Credit Points</Label>
              <Input
                id="credit_points"
                type="number"
                min="0"
                value={editedTask.credit_points || 0}
                onChange={(e) => setEditedTask({ ...editedTask, credit_points: parseInt(e.target.value) || 0 })}
              />
            </div>
          )}
          
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={editedTask.notes || ''}
              onChange={(e) => setEditedTask({ ...editedTask, notes: e.target.value })}
              placeholder="Add any notes about this task..."
              rows={3}
            />
          </div>
          
          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} className="bg-rose-gold hover:bg-rose-gold-dark text-white">
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminTaskDetailsDialog;