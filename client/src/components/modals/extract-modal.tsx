import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface ExtractModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExtractModal({ open, onOpenChange }: ExtractModalProps) {
  const [source, setSource] = useState("Meeting Notes");
  const [text, setText] = useState("");
  const [team, setTeam] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Extract Decision & Action Items</DialogTitle>
          <DialogDescription>
            Paste text from meeting notes, emails, or documents to automatically extract decisions and action items.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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
          
          <DialogFooter className="sm:justify-end">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Extracting...
                </>
              ) : (
                "Extract"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
