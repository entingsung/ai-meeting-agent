import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, Check, FileText, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActionItemCard } from "@/components/dashboard/action-item";
import { DecisionCard } from "@/components/dashboard/decision-card";
import { ExtractModal } from "@/components/modals/extract-modal";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";
import { ActionItem, Decision } from "@shared/schema";
import { Link } from "wouter";
import { queryClient } from "@/lib/queryClient";

export default function Dashboard() {
  const [isExtractModalOpen, setIsExtractModalOpen] = useState(false);
  const [actionItemsFilter, setActionItemsFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("action-items");

  // Fetch statistics
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/stats'],
  });

  // Fetch action items
  const { data: actionItems, isLoading: isLoadingActionItems } = useQuery({
    queryKey: ['/api/action-items'],
  });

  // Fetch decisions
  const { data: decisions, isLoading: isLoadingDecisions } = useQuery({
    queryKey: ['/api/decisions'],
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

  const getFilteredActionItems = () => {
    if (!actionItems) return [];
    
    switch (actionItemsFilter) {
      case "pending":
        return actionItems.filter(item => !item.completed);
      case "completed":
        return actionItems.filter(item => item.completed);
      case "overdue":
        const now = new Date();
        return actionItems.filter(item => 
          !item.completed && new Date(item.dueDate) < now
        );
      default:
        return actionItems;
    }
  };

  const filteredActionItems = getFilteredActionItems();
  
  // Find action items count per decision
  const getActionItemsCountByDecision = (decisionId: number) => {
    if (!actionItems) return 0;
    return actionItems.filter(item => item.decisionId === decisionId).length;
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <div className="mt-3 md:mt-0">
          <Button onClick={() => setIsExtractModalOpen(true)}>
            Import Data
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard 
          title="Pending Action Items"
          value={isLoadingStats ? "..." : stats?.pendingCount || 0}
          icon={<Clock />}
          iconBgColor="bg-red-100"
          iconColor="text-red-600"
          changeText="3 more than last week"
          changeType="increase"
        />
        
        <StatCard 
          title="Completed Items"
          value={isLoadingStats ? "..." : stats?.completedCount || 0}
          icon={<Check />}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
          changeText="5 more than last week"
          changeType="decrease"
          changeColor="text-green-600"
        />
        
        <StatCard 
          title="New Decisions"
          value={isLoadingStats ? "..." : stats?.decisionsCount || 0}
          icon={<FileText />}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
          changeText="This week"
        />
        
        <StatCard 
          title="Overdue Items"
          value={isLoadingStats ? "..." : stats?.overdueCount || 0}
          icon={<AlertTriangle />}
          iconBgColor="bg-amber-100"
          iconColor="text-amber-600"
          changeText="1 more than yesterday"
          changeType="increase"
          changeColor="text-amber-600"
        />
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex space-x-8">
          <button
            className={`border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === "action-items"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
            onClick={() => setActiveTab("action-items")}
          >
            Action Items
          </button>
          <button
            className={`border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === "decisions"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
            onClick={() => setActiveTab("decisions")}
          >
            Recent Decisions
          </button>
          <button
            className={`border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === "team-activity"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
            onClick={() => setActiveTab("team-activity")}
          >
            Team Activity
          </button>
        </div>
      </div>

      {/* Action Items Panel */}
      {activeTab === "action-items" && (
        <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Your Action Items</h3>
            <div className="flex space-x-2">
              <div className="relative">
                <Select
                  value={actionItemsFilter}
                  onValueChange={setActionItemsFilter}
                >
                  <SelectTrigger className="h-9 w-[130px]">
                    <SelectValue placeholder="Filter items" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Items</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button size="icon" variant="ghost">
                <Filter className="h-5 w-5 text-gray-500" />
              </Button>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {isLoadingActionItems ? (
              <div className="p-4 text-center text-gray-500">Loading action items...</div>
            ) : filteredActionItems.length > 0 ? (
              filteredActionItems.map(item => (
                <ActionItemCard 
                  key={item.id}
                  item={item}
                  onComplete={handleActionItemComplete}
                />
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                No action items found matching the selected filter.
              </div>
            )}
          </div>
          
          <div className="bg-gray-50 px-4 py-3 text-right sm:px-6">
            <Button variant="ghost" asChild>
              <Link href="/action-items">
                View All Action Items
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Recent Decisions Panel */}
      {activeTab === "decisions" && (
        <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
            <h3 className="text-lg font-medium text-gray-900">Recent Decisions</h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {isLoadingDecisions ? (
              <div className="p-4 text-center text-gray-500">Loading decisions...</div>
            ) : decisions && decisions.length > 0 ? (
              decisions.map((decision: Decision) => (
                <DecisionCard 
                  key={decision.id}
                  decision={decision}
                  actionItemsCount={getActionItemsCountByDecision(decision.id)}
                />
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                No decisions found. Import your first data using the button above.
              </div>
            )}
          </div>
          
          <div className="bg-gray-50 px-4 py-3 text-right sm:px-6">
            <Button variant="ghost" asChild>
              <Link href="/decisions">
                View All Decisions
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Team Activity Panel */}
      {activeTab === "team-activity" && (
        <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
            <h3 className="text-lg font-medium text-gray-900">Team Activity</h3>
          </div>
          
          <div className="p-6 text-center text-gray-500">
            Team activity tracking will be available in the next update.
          </div>
        </div>
      )}

      {/* Extract Modal */}
      <ExtractModal
        open={isExtractModalOpen}
        onOpenChange={setIsExtractModalOpen}
      />
    </div>
  );
}
