
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Save, Edit, Trash2, BookOpen, RotateCcw, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { apiService } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const DailyJournal = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [newEntryContent, setNewEntryContent] = useState('');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  // Fetch journal entries from backend
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['journal-entries'],
    queryFn: () => apiService.getJournalEntries(),
  });

  // Create journal entry mutation
  const createEntryMutation = useMutation({
    mutationFn: (entry: { date: string; content: string }) => 
      apiService.createJournalEntry(entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      setNewEntryContent('');
      toast({
        title: "Success",
        description: "Journal entry created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create journal entry",
        variant: "destructive",
      });
      console.error('Create journal entry error:', error);
    },
  });

  // Update journal entry mutation (using backend if available, or placeholder)
  const updateEntryMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => {
      // Placeholder for update - your backend should implement PATCH/PUT for journal entries
      console.log('Updating entry:', id, content);
      return Promise.resolve({ id, content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      setEditingEntryId(null);
      setEditingContent('');
      toast({
        title: "Success",
        description: "Journal entry updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update journal entry",
        variant: "destructive",
      });
      console.error('Update journal entry error:', error);
    },
  });

  // Delete journal entry mutation (placeholder - implement in your backend)
  const deleteEntryMutation = useMutation({
    mutationFn: (id: string) => {
      console.log('Deleting entry:', id);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast({
        title: "Success",
        description: "Journal entry deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete journal entry",
        variant: "destructive",
      });
      console.error('Delete journal entry error:', error);
    },
  });

  const handleCreateEntry = () => {
    if (!newEntryContent.trim()) return;
    
    createEntryMutation.mutate({
      date: selectedDate.toISOString().split('T')[0],
      content: newEntryContent,
    });
  };

  const handleEditEntry = (id: string, currentContent: string) => {
    setEditingEntryId(id);
    setEditingContent(currentContent);
  };

  const handleSaveEdit = () => {
    if (!editingEntryId || !editingContent.trim()) return;
    
    updateEntryMutation.mutate({
      id: editingEntryId,
      content: editingContent,
    });
  };

  const handleDeleteEntry = (id: string) => {
    deleteEntryMutation.mutate(id);
  };

  const handleResetEntry = (id: string) => {
    // Reset to original state - implement based on your backend
    console.log('Resetting entry:', id);
  };

  const handleRestartEntry = (id: string) => {
    // Restart entry - implement based on your backend
    console.log('Restarting entry:', id);
  };

  const todayEntries = entries.filter((entry: any) => {
    const entryDate = new Date(entry.date).toDateString();
    const selectedDateString = selectedDate.toDateString();
    return entryDate === selectedDateString;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-luxury-gold"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-montserrat text-foreground">Daily Journal</h1>
          <p className="text-muted-foreground font-opensans">
            Log your daily work, progress, and notes
          </p>
        </div>
      </div>

      {/* Date Picker */}
      <Card>
        <CardHeader>
          <CardTitle className="font-montserrat flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-luxury-gold" />
            Select Date
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* New Entry Form */}
      <Card>
        <CardHeader>
          <CardTitle className="font-montserrat flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-luxury-gold" />
            Add Journal Entry for {format(selectedDate, "MMMM d, yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder="What did you work on today? Any progress updates, challenges, or notes..."
              value={newEntryContent}
              onChange={(e) => setNewEntryContent(e.target.value)}
              rows={4}
            />
          </div>
          <Button 
            onClick={handleCreateEntry}
            disabled={!newEntryContent.trim() || createEntryMutation.isPending}
            className="gradient-gold text-charcoal-black"
          >
            <Save className="mr-2 h-4 w-4" />
            {createEntryMutation.isPending ? 'Saving...' : 'Save Entry'}
          </Button>
        </CardContent>
      </Card>

      {/* Entries for Selected Date */}
      <Card>
        <CardHeader>
          <CardTitle className="font-montserrat">
            Entries for {format(selectedDate, "MMMM d, yyyy")} ({todayEntries.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-opensans">No journal entries for this date</p>
              <p className="text-sm mt-2">Add your first entry above</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todayEntries.map((entry: any) => (
                <Card key={entry.id} className="border-l-4 border-l-luxury-gold">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm text-muted-foreground">
                        {new Date(entry.created_at).toLocaleTimeString()}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleResetEntry(entry.id)}
                          className="h-8 w-8 p-0 hover:bg-luxury-gold hover:text-charcoal-black"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRestartEntry(entry.id)}
                          className="h-8 w-8 p-0 hover:bg-progress-blue hover:text-white"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditEntry(entry.id, entry.content)}
                          className="h-8 w-8 p-0 hover:bg-luxury-gold hover:text-charcoal-black"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="h-8 w-8 p-0 hover:bg-blocked-red hover:text-white"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {editingEntryId === entry.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={handleSaveEdit}
                            className="gradient-gold text-charcoal-black"
                          >
                            Save
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setEditingEntryId(null);
                              setEditingContent('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="prose prose-sm max-w-none">
                        <p className="font-opensans text-foreground whitespace-pre-wrap">
                          {entry.content}
                        </p>
                      </div>
                    )}

                    {entry.task_updates && entry.task_updates.length > 0 && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <h4 className="font-semibold text-sm mb-2">Task Updates:</h4>
                        <div className="space-y-1">
                          {entry.task_updates.map((update: any, index: number) => (
                            <p key={index} className="text-sm text-muted-foreground">
                              • {update}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyJournal;
