import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ActionItemCard } from "@/components/dashboard/action-item";
import { ExtractModal } from "@/components/modals/extract-modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActionItem } from "@shared/schema";
import { SearchIcon, Filter, CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ActionItems() {
  const [isExtractModalOpen, setIsExtractModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [statusTab, setStatusTab] = useState("all");

  // Fetch action items
  const { data: actionItems, isLoading } = useQuery({
    queryKey: ['/api/action-items'],
  });

  const handleActionItemComplete = (id: number, completed: boolean) => {
    // Optimistic update
    const previousActionItems = queryClient.getQueryData(['/api/action-items']) as ActionItem[];
    
    if (previousActionItems) {
      queryClient.setQueryData(
        ['/api/action-items'],
        previousActionItems.map(item => 
          item.id === id ? { ...item, completed } : item
        )
      );
    }
    
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['/api/action-items'] });
    queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
  };

  // Filter action items
  const filteredActionItems = actionItems ? actionItems.filter((item: ActionItem) => {
    // Filter by tab first
    const matchesTab = 
      statusTab === "all" || 
      (statusTab === "pending" && !item.completed) ||
      (statusTab === "completed" && item.completed) ||
      (statusTab === "overdue" && !item.completed && new Date(item.dueDate) < new Date());
    
    // Then apply other filters
    const matchesSearch = 
      searchQuery === "" || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPriority = 
      priorityFilter === "all" || 
      item.priority.toLowerCase() === priorityFilter.toLowerCase();
    
    const matchesAssignee = 
      assigneeFilter === "all" || 
      item.assignee === assigneeFilter;
    
    return matchesTab && matchesSearch && matchesPriority && matchesAssignee;
  }) : [];

  // Get unique assignees and priorities for filters
  const assignees = actionItems ? [...new Set(actionItems.map((item: ActionItem) => item.assignee))] : [];
  const priorities = actionItems ? [...new Set(actionItems.map((item: ActionItem) => item.priority))] : [];

  // Count items by status
  const countByStatus = {
    all: actionItems?.length || 0,
    pending: actionItems?.filter((item: ActionItem) => !item.completed).length || 0,
    completed: actionItems?.filter((item: ActionItem) => item.completed).length || 0,
    overdue: actionItems?.filter((item: ActionItem) => 
      !item.completed && new Date(item.dueDate) < new Date()
    ).length || 0,
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Action Items</h1>
        <div className="mt-3 md:mt-0">
          <Button onClick={() => setIsExtractModalOpen(true)}>
            Extract New Decision
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <Tabs value={statusTab} onValueChange={setStatusTab} className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="all">
              All ({countByStatus.all})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({countByStatus.pending})
            </TabsTrigger>
            <TabsTrigger value="overdue">
              Overdue ({countByStatus.overdue})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({countByStatus.completed})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Search and filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search action items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex space-x-2">
            <Select 
              value={priorityFilter} 
              onValueChange={setPriorityFilter}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {priorities.map((priority) => (
                  <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select 
              value={assigneeFilter} 
              onValueChange={setAssigneeFilter}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                {assignees.map((assignee) => (
                  <SelectItem key={assignee} value={assignee}>{assignee}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Action Items List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            {statusTab === "all" && "All Action Items"}
            {statusTab === "pending" && "Pending Action Items"}
            {statusTab === "completed" && "Completed Action Items"}
            {statusTab === "overdue" && "Overdue Action Items"}
          </h3>
          <Button size="sm" variant="outline">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Calendar View
          </Button>
        </div>
        
        <div className="divide-y divide-gray-200">
          {isLoading ? (
            <div className="p-6 text-center text-gray-500">Loading action items...</div>
          ) : filteredActionItems.length > 0 ? (
            filteredActionItems.map((item: ActionItem) => (
              <ActionItemCard 
                key={item.id}
                item={item}
                onComplete={handleActionItemComplete}
              />
            ))
          ) : (
            <div className="p-6 text-center text-gray-500">
              {searchQuery || priorityFilter !== "all" || assigneeFilter !== "all" ? 
                "No action items found matching your filters." : 
                "No action items found. Extract your first decision to create action items."}
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
