// src/components/dashboard/StatCard.tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ReactNode } from "react";

interface StatCardProps {
  icon: ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  className?: string;
}

export const StatCard = ({ icon, title, value, subtitle, trend, className = "" }: StatCardProps) => (
  <Card className={`bg-zinc-900 border-zinc-800 ${className}`}>
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <div className="text-primary">{icon}</div>
        {trend !== undefined && (
          <span className={`text-sm px-2 py-1 rounded ${
            trend > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="text-sm text-gray-400 mt-2">{title}</p>
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-bold">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </CardContent>
  </Card>
);