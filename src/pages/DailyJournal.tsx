import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Save, Plus, Trash2, Mic, MicOff, Play, Pause, Square } from 'lucide-react';
import VoiceRecorder from '@/components/VoiceRecorder';

const DailyJournal = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [entry, setEntry] = useState({
    content: '',
    task_updates: [] as string[],
    next_goals: '',
    challenges: '',
    summary: '',
    voice_note_url: '',
    voice_note_duration: 0
  });
  const [newTaskUpdate, setNewTaskUpdate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState<any[]>([]);

  const fetchJournalEntries = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('daily_journal')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', selectedDate)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      toast({
        title: "Error",
        description: "Failed to fetch journal entries",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEntry = async () => {
    if (!user || !entry.content.trim()) return;

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('daily_journal')
        .insert({
          user_id: user.id,
          date: selectedDate,
          content: entry.content,
          task_updates: entry.task_updates,
          next_goals: entry.next_goals,
          challenges: entry.challenges,
          summary: entry.summary,
          voice_note_url: entry.voice_note_url,
          voice_note_duration: entry.voice_note_duration
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Journal entry saved successfully"
      });

      // Reset form
      setEntry({
        content: '',
        task_updates: [],
        next_goals: '',
        challenges: '',
        summary: '',
        voice_note_url: '',
        voice_note_duration: 0
      });

      // Refresh entries
      fetchJournalEntries();
    } catch (error) {
      console.error('Error saving journal entry:', error);
      toast({
        title: "Error",
        description: "Failed to save journal entry",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTaskUpdate = () => {
    if (!newTaskUpdate.trim()) return;
    
    setEntry(prev => ({
      ...prev,
      task_updates: [...prev.task_updates, newTaskUpdate]
    }));
    setNewTaskUpdate('');
  };

  const handleRemoveTaskUpdate = (index: number) => {
    setEntry(prev => ({
      ...prev,
      task_updates: prev.task_updates.filter((_, i) => i !== index)
    }));
  };

  const handleVoiceRecording = (audioBlob: Blob, duration: number) => {
    // Here you would upload the audio blob to storage and get the URL
    // For now, we'll just store the duration
    setEntry(prev => ({
      ...prev,
      voice_note_duration: duration
    }));
    
    toast({
      title: "Voice Note Recorded",
      description: `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')} minutes recorded`
    });
  };

  useEffect(() => {
    fetchJournalEntries();
  }, [user, selectedDate]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Daily Journal</h1>
          <p className="text-muted-foreground">
            Record your daily progress, challenges, and voice notes
          </p>
        </div>
      </div>

      {/* Date Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Select Date
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="max-w-xs"
          />
        </CardContent>
      </Card>

      {/* New Entry Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="content">Daily Progress</Label>
            <Textarea
              id="content"
              placeholder="What did you accomplish today? Share your progress, insights, and thoughts..."
              value={entry.content}
              onChange={(e) => setEntry(prev => ({ ...prev, content: e.target.value }))}
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="challenges">Challenges Faced</Label>
            <Textarea
              id="challenges"
              placeholder="What obstacles did you encounter? How did you overcome them?"
              value={entry.challenges}
              onChange={(e) => setEntry(prev => ({ ...prev, challenges: e.target.value }))}
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="next_goals">Tomorrow's Goals</Label>
            <Textarea
              id="next_goals"
              placeholder="What do you plan to work on tomorrow?"
              value={entry.next_goals}
              onChange={(e) => setEntry(prev => ({ ...prev, next_goals: e.target.value }))}
              rows={2}
            />
          </div>

          {/* Task Updates Section */}
          <div>
            <Label>Task Updates</Label>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Add a task update..."
                value={newTaskUpdate}
                onChange={(e) => setNewTaskUpdate(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTaskUpdate()}
              />
              <Button onClick={handleAddTaskUpdate} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {entry.task_updates.length > 0 && (
              <div className="mt-2 space-y-2">
                {entry.task_updates.map((update, index) => (
                  <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                    <span className="text-sm">{update}</span>
                    <Button
                      onClick={() => handleRemoveTaskUpdate(index)}
                      size="sm"
                      variant="ghost"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Voice Recorder */}
          <VoiceRecorder
            onRecordingComplete={handleVoiceRecording}
            existingAudioUrl={entry.voice_note_url}
          />

          <Button 
            onClick={handleSaveEntry}
            disabled={isLoading || !entry.content.trim()}
            className="w-full"
          >
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? 'Saving...' : 'Save Entry'}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Entries for {selectedDate}</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No journal entries for this date</p>
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => (
                <Card key={entry.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm text-muted-foreground">
                        {new Date(entry.created_at).toLocaleTimeString()}
                      </span>
                      {entry.voice_note_duration > 0 && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          Voice: {Math.floor(entry.voice_note_duration / 60)}:{(entry.voice_note_duration % 60).toString().padStart(2, '0')}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      {entry.content && (
                        <div>
                          <h4 className="font-semibold text-sm text-primary mb-1">Progress</h4>
                          <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
                        </div>
                      )}
                      
                      {entry.challenges && (
                        <div>
                          <h4 className="font-semibold text-sm text-destructive mb-1">Challenges</h4>
                          <p className="text-sm whitespace-pre-wrap">{entry.challenges}</p>
                        </div>
                      )}
                      
                      {entry.next_goals && (
                        <div>
                          <h4 className="font-semibold text-sm text-progress-blue mb-1">Tomorrow's Goals</h4>
                          <p className="text-sm whitespace-pre-wrap">{entry.next_goals}</p>
                        </div>
                      )}
                      
                      {entry.task_updates && entry.task_updates.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm text-completed-green mb-1">Task Updates</h4>
                          <ul className="list-disc list-inside space-y-1">
                            {entry.task_updates.map((update: string, index: number) => (
                              <li key={index} className="text-sm">{update}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
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
