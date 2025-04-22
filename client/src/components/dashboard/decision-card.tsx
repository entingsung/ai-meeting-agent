import { FileText, Calendar, Users, ClipboardList } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Decision } from "@shared/schema";
import { Link } from "wouter";

interface DecisionCardProps {
  decision: Decision;
  actionItemsCount: number;
}

export function DecisionCard({ decision, actionItemsCount }: DecisionCardProps) {
  const formattedDate = format(parseISO(decision.createdAt.toString()), 'MMM d, yyyy');
  
  return (
    <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-1">
          <Link href={`/decisions/${decision.id}`}>
            <a className="hover:text-primary">{decision.title}</a>
          </Link>
        </h4>
        <p className="text-sm text-gray-600 mb-2">{decision.description}</p>
        <div className="flex flex-wrap items-center text-xs text-gray-500">
          <span className="flex items-center mr-3">
            <Calendar className="h-3.5 w-3.5 mr-1 text-gray-400" />
            {formattedDate}
          </span>
          <span className="flex items-center mr-3">
            <Users className="h-3.5 w-3.5 mr-1 text-gray-400" />
            {decision.team || "No team specified"}
          </span>
          <span className="flex items-center mr-3">
            <ClipboardList className="h-3.5 w-3.5 mr-1 text-gray-400" />
            {actionItemsCount} Action Item{actionItemsCount !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center mr-3">
            <FileText className="h-3.5 w-3.5 mr-1 text-gray-400" />
            {decision.source}
          </span>
        </div>
      </div>
    </div>
  );
}
