import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Mic, CheckCircle, XCircle, Clock, Play, Headphones, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ExtractModal } from "@/components/modals/extract-modal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

type Recording = {
  id: string;
  title?: string;
  transcription?: string;
  duration?: number;
  status: "pending" | "transcribing" | "completed" | "failed";
  createdAt?: Date;
};

export default function Recordings() {
  const [extractModalOpen, setExtractModalOpen] = useState(false);
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [isLiveRecordingModalOpen, setIsLiveRecordingModalOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTitle, setRecordingTitle] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const { toast } = useToast();

  const { data: recordings, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/recordings'],
    queryFn: async () => {
      const response = await fetch('/api/recordings');
      if (!response.ok) {
        throw new Error('Failed to fetch recordings');
      }
      return response.json() as Promise<Recording[]>;
    }
  });

  const handleStartExtraction = (recording: Recording) => {
    if (recording.status !== 'completed') {
      toast({
        title: "Cannot Extract",
        description: "Recording must be fully processed before extraction",
        variant: "destructive",
      });
      return;
    }

    setSelectedRecordingId(recording.id);
    setSelectedRecording(recording);
    setExtractModalOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'transcribing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    let variant: "default" | "secondary" | "destructive" | "outline" = "default";
    let label = "Unknown";

    switch (status) {
      case 'pending':
        variant = "outline";
        label = "Pending";
        break;
      case 'transcribing':
        variant = "secondary";
        label = "Transcribing";
        break;
      case 'completed':
        variant = "default";
        label = "Ready";
        break;
      case 'failed':
        variant = "destructive";
        label = "Failed";
        break;
    }

    return (
      <Badge variant={variant} className="ml-2">
        {label}
      </Badge>
    );
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "Unknown";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  const startLiveRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      // Clear any previous audio chunks
      setAudioChunks([]);
      
      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      
      // Update recording time
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Collect audio chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(prev => [...prev, event.data]);
        }
      };
      
      toast({
        title: "Recording Started",
        description: "Meeting is now being recorded in real-time",
      });
      
    } catch (error) {
      toast({
        title: "Recording Failed",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
      console.error("Error starting recording:", error);
    }
  };
  
  const stopLiveRecording = async () => {
    if (!mediaRecorderRef.current || !audioStream) return;
    
    // Stop the recorder
    mediaRecorderRef.current.stop();
    
    // Stop all audio tracks
    audioStream.getAudioTracks().forEach(track => track.stop());
    setAudioStream(null);
    
    // Clear the timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setIsRecording(false);
    
    // Create a blob from the recorded chunks
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    
    // Create a FormData object to send to server
    const formData = new FormData();
    formData.append('audio', audioBlob, `${recordingTitle || 'Live Recording'}.webm`);
    formData.append('title', recordingTitle || 'Live Recording');
    
    try {
      // Upload the recording
      const response = await fetch('/api/recordings/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload recording');
      }
      
      // Refresh the recordings list
      refetch();
      
      toast({
        title: "Recording Saved",
        description: "Your meeting recording has been saved and is being processed",
      });
      
      // Reset recording title and time
      setRecordingTitle('');
      setRecordingTime(0);
      setIsLiveRecordingModalOpen(false);
      
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Could not save the recording. Please try again.",
        variant: "destructive",
      });
      console.error("Error uploading recording:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meeting Recordings</h1>
          <p className="text-muted-foreground">
            Upload and transcribe meeting recordings to extract decisions and action items
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => setIsLiveRecordingModalOpen(true)}>
            <Radio className="mr-2 h-4 w-4 text-red-500" />
            Record in Real Time
          </Button>
          <Button onClick={() => setExtractModalOpen(true)}>
            <Mic className="mr-2 h-4 w-4" />
            Upload Recording
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center p-10 bg-red-50 text-red-600 rounded-md">
          <p>Failed to load recordings</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      ) : recordings && recordings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recordings.map((recording) => (
            <Card key={recording.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <div className="truncate">
                    {recording.title || `Recording ${recording.id.slice(0, 8)}`}
                  </div>
                  {getStatusBadge(recording.status)}
                </CardTitle>
                <CardDescription>
                  {recording.createdAt ? format(new Date(recording.createdAt), 'MMM dd, yyyy • h:mm a') : 'Unknown date'}
                  {recording.duration && ` • ${formatDuration(recording.duration)}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-0">
                {recording.transcription ? (
                  <div className="mb-4 max-h-24 overflow-hidden relative">
                    <p className="text-sm text-gray-600 line-clamp-4">
                      {recording.transcription}
                    </p>
                    <div className="absolute bottom-0 w-full h-8 bg-gradient-to-t from-white to-transparent"></div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-20 bg-gray-50 rounded-md mb-4">
                    <div className="flex flex-col items-center text-gray-500">
                      {getStatusIcon(recording.status)}
                      <span className="text-xs mt-1">
                        {recording.status === 'pending' && 'Waiting to process...'}
                        {recording.status === 'transcribing' && 'Transcribing audio...'}
                        {recording.status === 'failed' && 'Transcription failed'}
                        {recording.status === 'completed' && 'No transcription preview'}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between pt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={!recording.transcription}
                >
                  <Headphones className="h-4 w-4 mr-2" />
                  Listen
                </Button>
                <Button 
                  size="sm"
                  onClick={() => handleStartExtraction(recording)}
                  disabled={recording.status !== 'completed'}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Extract
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center p-16 bg-gray-50 rounded-md">
          <Mic className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium">No recordings yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            Upload a meeting recording to get started
          </p>
          <Button className="mt-4" onClick={() => setExtractModalOpen(true)}>
            Upload Recording
          </Button>
        </div>
      )}

      <ExtractModal 
        open={extractModalOpen} 
        onOpenChange={setExtractModalOpen} 
      />
      
      {/* Live Recording Dialog */}
      <Dialog open={isLiveRecordingModalOpen} onOpenChange={setIsLiveRecordingModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isRecording ? "Recording in Progress" : "Record Meeting in Real-Time"}
            </DialogTitle>
            <DialogDescription>
              {isRecording 
                ? "Your meeting is being recorded. You can stop the recording at any time." 
                : "Start recording your meeting in real-time to capture decisions and action items."}
            </DialogDescription>
          </DialogHeader>
          
          {!isRecording && (
            <div className="grid gap-4 py-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="recording-title" className="text-sm font-medium">
                  Meeting Title
                </label>
                <Input
                  id="recording-title"
                  placeholder="Weekly Team Sync"
                  value={recordingTitle}
                  onChange={(e) => setRecordingTitle(e.target.value)}
                />
              </div>
            </div>
          )}
          
          {isRecording && (
            <div className="py-6 flex flex-col items-center justify-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <Radio className="h-8 w-8 text-red-600 animate-pulse" />
              </div>
              
              <p className="text-2xl font-mono mb-2">
                {formatDuration(recordingTime)}
              </p>
              
              <p className="text-sm text-muted-foreground">
                Recording in progress...
              </p>
            </div>
          )}
          
          <DialogFooter className="sm:justify-between">
            {isRecording ? (
              <>
                <div className="text-sm text-muted-foreground">
                  Microphone active
                </div>
                <Button 
                  variant="destructive" 
                  onClick={stopLiveRecording}
                >
                  Stop Recording
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setIsLiveRecordingModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="default" 
                  onClick={startLiveRecording}
                >
                  Start Recording
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}