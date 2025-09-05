import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Play, Pause, Square, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  existingAudioUrl?: string;
  disabled?: boolean;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ 
  onRecordingComplete, 
  existingAudioUrl, 
  disabled = false 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: 'audio/wav' });
        setAudioBlob(blob);
        onRecordingComplete(blob, recordingTime);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      mediaRecorderRef.current = recorder;

      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  };

  const playAudio = () => {
    if (audioBlob || existingAudioUrl) {
      const audio = new Audio();
      audio.src = audioBlob ? URL.createObjectURL(audioBlob) : existingAudioUrl!;
      audio.play();
      setIsPlaying(true);
      
      audio.onended = () => {
        setIsPlaying(false);
      };
      
      audioRef.current = audio;
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Voice Note
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          {!isRecording ? (
            <Button
              onClick={startRecording}
              disabled={disabled}
              variant="outline"
              size="sm"
            >
              <Mic className="h-4 w-4 mr-2" />
              Record
            </Button>
          ) : (
            <Button
              onClick={stopRecording}
              variant="destructive"
              size="sm"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop ({formatTime(recordingTime)})
            </Button>
          )}

          {(audioBlob || existingAudioUrl) && (
            <Button
              onClick={isPlaying ? pauseAudio : playAudio}
              variant="outline"
              size="sm"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
          )}
        </div>

        {isRecording && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
            Recording: {formatTime(recordingTime)}
          </div>
        )}

        {audioBlob && (
          <div className="text-sm text-muted-foreground">
            Recording saved ({formatTime(recordingTime)})
          </div>
        )}

        {existingAudioUrl && !audioBlob && (
          <div className="text-sm text-muted-foreground">
            Voice note available
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VoiceRecorder;