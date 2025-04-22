import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DecisionCard } from "@/components/dashboard/decision-card";
import { ExtractModal } from "@/components/modals/extract-modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Decision } from "@shared/schema";
import { SearchIcon, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Decisions() {
  const [isExtractModalOpen, setIsExtractModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  // Fetch decisions
  const { data: decisions, isLoading } = useQuery({
    queryKey: ['/api/decisions'],
  });

  // Fetch action items to count per decision
  const { data: actionItems } = useQuery({
    queryKey: ['/api/action-items'],
  });

  // Find action items count per decision
  const getActionItemsCountByDecision = (decisionId: number) => {
    if (!actionItems) return 0;
    return actionItems.filter(item => item.decisionId === decisionId).length;
  };

  // Filter and search decisions
  const filteredDecisions = decisions ? decisions.filter((decision: Decision) => {
    const matchesSearch = 
      searchQuery === "" || 
      decision.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      decision.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTeam = 
      teamFilter === "all" || 
      (decision.team && decision.team === teamFilter);
    
    const matchesSource = 
      sourceFilter === "all" || 
      decision.source === sourceFilter;
    
    return matchesSearch && matchesTeam && matchesSource;
  }) : [];

  // Get unique teams and sources for filters
  const teams = decisions ? [...new Set(decisions.map((d: Decision) => d.team).filter(Boolean))] : [];
  const sources = decisions ? [...new Set(decisions.map((d: Decision) => d.source))] : [];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Decisions</h1>
        <div className="mt-3 md:mt-0">
          <Button onClick={() => setIsExtractModalOpen(true)}>
            Import Data
          </Button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search decisions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex space-x-2">
            <Select 
              value={teamFilter} 
              onValueChange={setTeamFilter}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team} value={team}>{team}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select 
              value={sourceFilter} 
              onValueChange={setSourceFilter}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {sources.map((source) => (
                  <SelectItem key={source} value={source}>{source}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Decisions List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
          <h3 className="text-lg font-medium text-gray-900">All Decisions</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {isLoading ? (
            <div className="p-6 text-center text-gray-500">Loading decisions...</div>
          ) : filteredDecisions.length > 0 ? (
            filteredDecisions.map((decision: Decision) => (
              <DecisionCard 
                key={decision.id}
                decision={decision}
                actionItemsCount={getActionItemsCountByDecision(decision.id)}
              />
            ))
          ) : (
            <div className="p-6 text-center text-gray-500">
              {searchQuery || teamFilter !== "all" || sourceFilter !== "all" ? 
                "No decisions found matching your filters." : 
                "No decisions found. Import your first data using the button above."}
            </div>
          )}
        </div>
      </div>

      {/* Extract Modal */}
      <ExtractModal
        open={isExtractModalOpen}
        onOpenChange={setIsExtractModalOpen}
      />
    </div>
  );
}
