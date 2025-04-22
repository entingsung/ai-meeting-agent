import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mic, Upload, FileText } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

interface ExtractModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExtractModal({ open, onOpenChange }: ExtractModalProps) {
  const [source, setSource] = useState("Meeting Recording");
  const [text, setText] = useState("");
  const [team, setTeam] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("audio");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<"pending" | "transcribing" | "completed" | "failed" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!text.trim()) {
      toast({
        title: "Error",
        description: "Please enter text to analyze",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      await apiRequest("POST", "/api/extract", {
        text,
        source,
        team
      });
      
      toast({
        title: "Success",
        description: "Decision and action items extracted successfully",
      });
      
      // Reset form and close modal
      setText("");
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/decisions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/action-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to extract decisions and action items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };
  
  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select an audio file to upload",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    setUploadProgress(0);
    
    const formData = new FormData();
    formData.append('audio', selectedFile);
    if (team) {
      formData.append('team', team);
    }
    
    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 5;
          return newProgress < 90 ? newProgress : 90;
        });
      }, 300);
      
      const response = await fetch('/api/recordings/upload', {
        method: 'POST',
        body: formData,
      });
      
      clearInterval(progressInterval);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }
      
      const data = await response.json();
      setUploadProgress(100);
      setRecordingId(data.recording.id);
      setProcessingStatus(data.recording.status);
      
      toast({
        title: "Upload Successful",
        description: "Audio file uploaded and being processed. This may take a few minutes.",
      });
      
      // Start polling for recording status
      pollRecordingStatus(data.recording.id);
      
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload audio file",
        variant: "destructive",
      });
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };
  
  const pollRecordingStatus = async (id: string) => {
    try {
      const checkStatus = async () => {
        const response = await fetch(`/api/recordings/${id}`);
        if (!response.ok) {
          throw new Error('Failed to check recording status');
        }
        
        const recording = await response.json();
        setProcessingStatus(recording.status);
        
        if (recording.status === 'completed') {
          // Automatically extract decisions and action items
          await extractFromRecording(id);
        } else if (recording.status === 'failed') {
          toast({
            title: "Processing Failed",
            description: "Failed to process the audio recording. Please try again.",
            variant: "destructive",
          });
        } else {
          // Continue polling
          setTimeout(checkStatus, 5000);
        }
      };
      
      // Start the polling
      setTimeout(checkStatus, 5000);
    } catch (error) {
      console.error('Error polling recording status:', error);
    }
  };
  
  const extractFromRecording = async (id: string) => {
    setLoading(true);
    
    try {
      const response = await apiRequest("POST", `/api/recordings/${id}/extract`, {
        source: "Meeting Recording",
        team
      });
      
      toast({
        title: "Success",
        description: "Decision and action items extracted successfully from the recording",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/decisions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/action-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Extraction Failed",
        description: error instanceof Error ? error.message : "Failed to extract from recording",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const resetForm = () => {
    setText("");
    setSelectedFile(null);
    setUploadProgress(0);
    setRecordingId(null);
    setProcessingStatus(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };
  
  const renderAudioUploadTab = () => {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          {!recordingId ? (
            <>
              <Label htmlFor="audioFile">Upload Meeting Recording</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Input
                  id="audioFile"
                  type="file"
                  ref={fileInputRef}
                  accept="audio/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="space-y-2">
                  <div className="flex justify-center mb-4">
                    <Upload className="h-10 w-10 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">
                    Drag and drop an audio file, or click to browse
                  </p>
                  <p className="text-xs text-gray-400">
                    MP3, WAV, M4A or WebM files up to 50MB
                  </p>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Select File
                  </Button>
                </div>
                {selectedFile && (
                  <div className="mt-4 p-2 bg-gray-50 rounded flex items-center justify-between">
                    <div className="flex items-center">
                      <Mic className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-sm text-gray-700 truncate max-w-[200px]">
                        {selectedFile.name}
                      </span>
                    </div>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setSelectedFile(null)}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Recording Status</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Status:</span>
                    <span className="text-sm font-medium">
                      {processingStatus === 'pending' && 'Preparing...'}
                      {processingStatus === 'transcribing' && 'Transcribing audio...'}
                      {processingStatus === 'completed' && 'Transcription completed'}
                      {processingStatus === 'failed' && 'Processing failed'}
                    </span>
                  </div>
                  {(processingStatus === 'pending' || processingStatus === 'transcribing') && (
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2 text-primary" />
                      <span className="text-xs text-gray-500">
                        This may take a few minutes depending on the audio length
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {processingStatus === 'failed' && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetForm}
                  className="w-full"
                >
                  Try Again
                </Button>
              )}
            </div>
          )}
        </div>
        
        {uploadProgress > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="extractTeam">Team/Project</Label>
            <span className="text-xs text-gray-500">Optional</span>
          </div>
          <Select 
            value={team} 
            onValueChange={setTeam}
          >
            <SelectTrigger id="extractTeam">
              <SelectValue placeholder="Select team or project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Product Team">Product Team</SelectItem>
              <SelectItem value="Marketing">Marketing</SelectItem>
              <SelectItem value="Engineering">Engineering</SelectItem>
              <SelectItem value="Sales">Sales</SelectItem>
              <SelectItem value="Finance">Finance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };
  
  const renderTextInputTab = () => {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="extractSource">Source</Label>
          <Select
            value={source}
            onValueChange={setSource}
          >
            <SelectTrigger id="extractSource">
              <SelectValue placeholder="Select source type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Meeting Notes">Meeting Notes</SelectItem>
              <SelectItem value="Email">Email</SelectItem>
              <SelectItem value="Document">Document</SelectItem>
              <SelectItem value="Slack Conversation">Slack Conversation</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="extractText">Text to analyze</Label>
          <Textarea
            id="extractText"
            rows={6}
            placeholder="Paste meeting notes, email content, or any text to extract decisions and action items..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="resize-none"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="extractTeam">Team/Project</Label>
            <span className="text-xs text-gray-500">Optional</span>
          </div>
          <Select 
            value={team} 
            onValueChange={setTeam}
          >
            <SelectTrigger id="extractTeam">
              <SelectValue placeholder="Select team or project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Product Team">Product Team</SelectItem>
              <SelectItem value="Marketing">Marketing</SelectItem>
              <SelectItem value="Engineering">Engineering</SelectItem>
              <SelectItem value="Sales">Sales</SelectItem>
              <SelectItem value="Finance">Finance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Extract Decision & Action Items</DialogTitle>
          <DialogDescription>
            Upload a meeting recording or paste text to automatically extract decisions and action items.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="audio" value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="audio" className="flex items-center">
              <Mic className="h-4 w-4 mr-2" />
              Recording
            </TabsTrigger>
            <TabsTrigger value="text" className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Text
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="audio">
            {renderAudioUploadTab()}
          </TabsContent>
          
          <TabsContent value="text">
            {renderTextInputTab()}
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="sm:justify-end">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          {activeTab === "audio" ? (
            (recordingId && processingStatus === 'completed') ? (
              <Button 
                type="button" 
                onClick={() => extractFromRecording(recordingId)}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  "Extract from Recording"
                )}
              </Button>
            ) : (
              <Button 
                type="button" 
                onClick={handleFileUpload}
                disabled={!selectedFile || loading || uploadProgress > 0 || !!recordingId}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload & Process"
                )}
              </Button>
            )
          ) : (
            <Button 
              type="button" 
              onClick={handleTextSubmit}
              disabled={loading || !text.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Extracting...
                </>
              ) : (
                "Extract"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
