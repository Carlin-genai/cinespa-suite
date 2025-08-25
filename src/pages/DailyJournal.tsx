
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabaseApi } from '@/lib/supabaseApi';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  BookOpen, 
  Plus, 
  CalendarIcon, 
  Save, 
  Edit, 
  Trash2, 
  Clock,
  CheckSquare,
  AlertCircle,
  Bell,
  RotateCcw,
  RefreshCw
} from 'lucide-react';
import TaskEditDialog from '@/components/Tasks/TaskEditDialog';
import ReminderDialog from '@/components/Tasks/ReminderDialog';

const DailyJournal = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [newEntry, setNewEntry] = useState('');
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [reminderTask, setReminderTask] = useState<any>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: journalEntries = [], isLoading } = useQuery({
    queryKey: ['journal-entries'],
    queryFn: supabaseApi.getDailyJournalEntries,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks-for-journal'],
    queryFn: supabaseApi.getTasks,
  });

  const createEntryMutation = useMutation({
    mutationFn: supabaseApi.createJournalEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      setNewEntry('');
      toast({ title: 'Journal entry created successfully!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Error creating entry', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, entry }: { id: string; entry: any }) => 
      supabaseApi.updateJournalEntry(id, entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      setEditingEntry(null);
      toast({ title: 'Journal entry updated successfully!' });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, task }: { id: string; task: any }) => 
      supabaseApi.updateTask(id, task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-for-journal'] });
      toast({ title: 'Task updated successfully!' });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: supabaseApi.deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-for-journal'] });
      toast({ title: 'Task deleted successfully!' });
    },
  });

  const createReminderMutation = useMutation({
    mutationFn: (reminder: any) => supabaseApi.createReminder({
      ...reminder,
      task_id: reminderTask?.id
    }),
    onSuccess: () => {
      toast({ title: 'Reminder set successfully!' });
      setShowReminderDialog(false);
      setReminderTask(null);
    },
  });

  const handleCreateEntry = () => {
    if (!newEntry.trim()) return;
    
    createEntryMutation.mutate({
      date: format(selectedDate, 'yyyy-MM-dd'),
      content: newEntry,
      task_updates: tasks.map(task => ({
        task_id: task.id,
        status: task.status,
        progress: task.status === 'completed' ? 100 : 
                 task.status === 'in-progress' ? 50 : 0
      }))
    });
  };

  const handleUpdateEntry = (entry: any) => {
    updateEntryMutation.mutate({
      id: entry.id,
      entry: {
        content: entry.content,
        task_updates: entry.task_updates
      }
    });
  };

  const handleTaskAction = (task: any, action: string) => {
    let updates: any = {};
    
    switch (action) {
      case 'reset':
        updates = { status: 'pending' };
        break;
      case 'restart':
        updates = { status: 'in-progress' };
        break;
      case 'complete':
        updates = { status: 'completed' };
        break;
      default:
        return;
    }
    
    updateTaskMutation.mutate({ id: task.id, task: updates });
  };

  const todayEntries = journalEntries.filter(entry => 
    entry.date === format(selectedDate, 'yyyy-MM-dd')
  );

  const todayTasks = tasks.filter(task => {
    if (!task.due_date) return false;
    return format(new Date(task.due_date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-luxury-gold"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-montserrat text-foreground flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-luxury-gold" />
            Daily Journal
          </h1>
          <p className="text-muted-foreground font-opensans">
            Track your daily progress and task updates
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar and New Entry */}
        <div className="lg:col-span-1 space-y-6">
          {/* Date Picker */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-montserrat">Select Date</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          {/* New Entry Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-montserrat">New Entry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Entry for {format(selectedDate, 'PPP')}</Label>
                <Textarea
                  value={newEntry}
                  onChange={(e) => setNewEntry(e.target.value)}
                  placeholder="Write about your daily progress, thoughts, and task updates..."
                  rows={6}
                />
              </div>
              <Button 
                onClick={handleCreateEntry}
                disabled={!newEntry.trim() || createEntryMutation.isPending}
                className="w-full gradient-gold text-charcoal-black"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Entry
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Journal Entries and Tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-montserrat flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-luxury-gold" />
                Tasks for {format(selectedDate, 'PPP')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {todayTasks.map((task) => (
                  <div key={task.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{task.title}</h4>
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                        {task.notes && (
                          <p className="text-sm bg-muted p-2 rounded mt-2">
                            <strong>Notes:</strong> {task.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Badge variant={
                          task.status === 'completed' ? 'default' :
                          task.status === 'in-progress' ? 'secondary' :
                          task.status === 'overdue' ? 'destructive' : 'outline'
                        }>
                          {task.status}
                        </Badge>
                        <Badge variant="outline">{task.priority}</Badge>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedTask(task);
                          setShowTaskDialog(true);
                        }}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReminderTask(task);
                          setShowReminderDialog(true);
                        }}
                      >
                        <Bell className="h-3 w-3 mr-1" />
                        Reminder
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTaskAction(task, 'reset')}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Reset
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTaskAction(task, 'restart')}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Restart
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteTaskMutation.mutate(task.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
                {todayTasks.length === 0 && (
                  <p className="text-center text-muted-foreground py-6">
                    No tasks scheduled for this date
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Journal Entries */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-montserrat">
                Journal Entries for {format(selectedDate, 'PPP')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {todayEntries.map((entry) => (
                  <div key={entry.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {new Date(entry.created_at).toLocaleTimeString()}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingEntry(entry)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="whitespace-pre-wrap">{entry.content}</p>
                    
                    {entry.task_updates && entry.task_updates.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <h5 className="text-sm font-medium mb-2">Task Updates:</h5>
                        <div className="space-y-1">
                          {entry.task_updates.map((update: any, index: number) => (
                            <div key={index} className="text-sm text-muted-foreground">
                              Task {update.task_id}: {update.status} ({update.progress}%)
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {todayEntries.length === 0 && (
                  <p className="text-center text-muted-foreground py-6">
                    No journal entries for this date
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Entry Dialog */}
      {editingEntry && (
        <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Journal Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={editingEntry.content}
                onChange={(e) => setEditingEntry({
                  ...editingEntry,
                  content: e.target.value
                })}
                rows={6}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditingEntry(null)}>
                  Cancel
                </Button>
                <Button onClick={() => handleUpdateEntry(editingEntry)}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Task Edit Dialog */}
      <TaskEditDialog
        task={selectedTask}
        open={showTaskDialog}
        onOpenChange={setShowTaskDialog}
        onSave={(updatedTask) => {
          updateTaskMutation.mutate({ id: updatedTask.id, task: updatedTask });
          setShowTaskDialog(false);
        }}
        onDelete={(taskId) => {
          deleteTaskMutation.mutate(taskId);
          setShowTaskDialog(false);
        }}
        onReset={(taskId) => {
          const task = tasks.find(t => t.id === taskId);
          if (task) handleTaskAction(task, 'reset');
          setShowTaskDialog(false);
        }}
        onRestart={(taskId) => {
          const task = tasks.find(t => t.id === taskId);
          if (task) handleTaskAction(task, 'restart');
          setShowTaskDialog(false);
        }}
      />

      {/* Reminder Dialog */}
      <ReminderDialog
        open={showReminderDialog}
        onOpenChange={setShowReminderDialog}
        onSave={(reminder) => createReminderMutation.mutate(reminder)}
        taskId={reminderTask?.id || ''}
        taskTitle={reminderTask?.title || ''}
      />
    </div>
  );
};

export default DailyJournal;
