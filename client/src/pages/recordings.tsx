import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Mic, CheckCircle, XCircle, Clock, Play, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meeting Recordings</h1>
          <p className="text-muted-foreground">
            Upload and transcribe meeting recordings to extract decisions and action items
          </p>
        </div>
        <Button onClick={() => setExtractModalOpen(true)}>
          <Mic className="mr-2 h-4 w-4" />
          Upload Recording
        </Button>
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
    </div>
  );
}