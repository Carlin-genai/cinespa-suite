
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Calendar as CalendarIcon, Plus, Save, Edit, Trash2 } from 'lucide-react';
import { supabaseApi } from '@/lib/supabaseApi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Task } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface JournalEntry {
  id: string;
  date: string;
  content: string;
  task_updates: any[];
  created_at: string;
}

const DailyJournal = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [content, setContent] = useState('');
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [taskUpdates, setTaskUpdates] = useState<any[]>([]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch journal entries
  const { data: journalEntries = [] } = useQuery<JournalEntry[]>({
    queryKey: ['journal-entries'],
    queryFn: supabaseApi.getDailyJournalEntries,
  });

  // Fetch user tasks for task updates
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['user-tasks-journal'],
    queryFn: supabaseApi.getTasks,
  });

  // Mutations
  const createEntryMutation = useMutation({
    mutationFn: (entry: { date: string; content: string; task_updates?: any[] }) =>
      supabaseApi.createJournalEntry(entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast({ title: 'Success', description: 'Journal entry saved!' });
      setContent('');
      setTaskUpdates([]);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to save journal entry', variant: 'destructive' });
    }
  });

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, entry }: { id: string; entry: { content: string; task_updates?: any[] } }) =>
      supabaseApi.updateJournalEntry(id, entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast({ title: 'Success', description: 'Journal entry updated!' });
      setEditingEntry(null);
      setContent('');
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update journal entry', variant: 'destructive' });
    }
  });

  // Get entry for selected date
  const selectedDateEntry = journalEntries.find(
    entry => format(new Date(entry.date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
  );

  useEffect(() => {
    if (selectedDateEntry && !editingEntry) {
      setContent(selectedDateEntry.content || '');
      setTaskUpdates(selectedDateEntry.task_updates || []);
    } else if (!selectedDateEntry) {
      setContent('');
      setTaskUpdates([]);
    }
  }, [selectedDate, selectedDateEntry, editingEntry]);

  const handleSave = () => {
    const dateString = format(selectedDate, 'yyyy-MM-dd');
    
    if (selectedDateEntry) {
      updateEntryMutation.mutate({
        id: selectedDateEntry.id,
        entry: { content, task_updates: taskUpdates }
      });
    } else {
      createEntryMutation.mutate({
        date: dateString,
        content,
        task_updates: taskUpdates
      });
    }
  };

  const addTaskUpdate = (task: Task, status: string, notes: string) => {
    const update = {
      task_id: task.id,
      task_title: task.title,
      status_change: status,
      notes,
      timestamp: new Date().toISOString()
    };
    setTaskUpdates([...taskUpdates, update]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-montserrat text-foreground flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-luxury-gold" />
            Daily Journal
          </h1>
          <p className="text-muted-foreground font-opensans mt-1">
            Document your daily work progress and task updates.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-montserrat text-foreground flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-luxury-gold" />
              Select Date
            </CardTitle>
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

        {/* Journal Entry */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-montserrat text-foreground">
              Journal Entry - {format(selectedDate, 'MMMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Main Content */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Daily Summary
              </label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write about your daily work, accomplishments, challenges, and thoughts..."
                className="min-h-[200px]"
              />
            </div>

            {/* Task Updates */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Task Updates
              </label>
              <div className="space-y-2">
                {taskUpdates.map((update, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-foreground">{update.task_title}</h4>
                        <Badge variant="outline" className="mt-1">{update.status_change}</Badge>
                        {update.notes && (
                          <p className="text-sm text-muted-foreground mt-2">{update.notes}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setTaskUpdates(taskUpdates.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Quick Task Status Updates */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Quick Task Updates
              </label>
              <div className="grid gap-2 md:grid-cols-2">
                {tasks.slice(0, 4).map((task) => (
                  <Card key={task.id} className="p-3">
                    <h4 className="font-medium text-foreground text-sm">{task.title}</h4>
                    <div className="flex gap-1 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addTaskUpdate(task, 'Started', 'Began working on this task')}
                        className="text-xs"
                      >
                        Started
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addTaskUpdate(task, 'Progress', 'Made significant progress')}
                        className="text-xs"
                      >
                        Progress
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addTaskUpdate(task, 'Completed', 'Finished this task')}
                        className="text-xs"
                      >
                        Done
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={handleSave} className="gradient-gold text-charcoal-black">
                <Save className="mr-2 h-4 w-4" />
                Save Entry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-montserrat text-foreground">
            Recent Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {journalEntries.slice(0, 5).map((entry) => (
              <Card key={entry.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">
                      {format(new Date(entry.date), 'MMMM d, yyyy')}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {entry.content}
                    </p>
                    {entry.task_updates && entry.task_updates.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {entry.task_updates.slice(0, 3).map((update, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {update.task_title}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedDate(new Date(entry.date));
                      setEditingEntry(entry);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyJournal;
