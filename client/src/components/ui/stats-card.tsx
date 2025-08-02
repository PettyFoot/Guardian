import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  trend?: string;
  trendText?: string;
  trendType?: "positive" | "negative";
  subtext?: string;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  trend,
  trendText,
  trendType,
  subtext
}: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          </div>
          <div className={`w-12 h-12 ${iconBg} rounded-lg flex items-center justify-center`}>
            <Icon className={iconColor} size={24} />
          </div>
        </div>
        {(trend && trendText) && (
          <div className="flex items-center mt-4 text-sm">
            {trendType === "positive" ? (
              <TrendingUp className="text-green-500 mr-1" size={16} />
            ) : (
              <TrendingDown className="text-red-500 mr-1" size={16} />
            )}
            <span className={`font-medium ${trendType === "positive" ? "text-green-500" : "text-red-500"}`}>
              {trend}
            </span>
            <span className="text-gray-500 ml-1">{trendText}</span>
          </div>
        )}
        {subtext && (
          <p className="text-sm text-gray-500 mt-4">{subtext}</p>
        )}
      </CardContent>
    </Card>
  );
}
