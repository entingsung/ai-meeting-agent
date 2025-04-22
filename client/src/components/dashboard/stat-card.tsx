import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  changeText?: string;
  changeType?: 'increase' | 'decrease' | 'neutral';
  changeColor?: string;
}

export function StatCard({
  title,
  value,
  icon,
  iconBgColor,
  iconColor,
  changeText,
  changeType,
  changeColor
}: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-semibold text-gray-900">{value}</p>
        </div>
        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", iconBgColor)}>
          <div className={cn("h-6 w-6", iconColor)}>
            {icon}
          </div>
        </div>
      </div>
      {changeText && (
        <div className="mt-2">
          <p className={cn(
            "text-sm flex items-center",
            changeColor || (
              changeType === 'increase' ? 'text-red-600' :
              changeType === 'decrease' ? 'text-green-600' : 
              'text-gray-600'
            )
          )}>
            {changeType === 'increase' && <ArrowUp className="h-4 w-4 mr-1" />}
            {changeType === 'decrease' && <ArrowDown className="h-4 w-4 mr-1" />}
            {changeText}
          </p>
        </div>
      )}
    </div>
  );
}
