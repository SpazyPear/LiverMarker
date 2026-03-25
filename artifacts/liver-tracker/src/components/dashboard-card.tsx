import { ArrowDownRight, ArrowUpRight, Minus, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn, formatPercent, formatValue } from "@/lib/utils";
import type { MarkerDashboard } from "@workspace/api-client-react/src/generated/api.schemas";
import { motion } from "framer-motion";

interface DashboardCardProps {
  data: MarkerDashboard;
  index: number;
}

export function DashboardCard({ data, index }: DashboardCardProps) {
  const { marker, currentValue, threedayAverage, threedayTrend, percentFromRef } = data;
  
  // Determine if the current state is considered "healthy" or "warning"
  // For liver markers, usually being within the reference range is good.
  const isHealthy = percentFromRef !== null && percentFromRef <= 0;
  const hasData = currentValue !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1, ease: "easeOut" }}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-card p-6 shadow-sm border border-border/50 hover:shadow-md hover:border-border transition-all duration-300"
    >
      {/* Decorative Status Top Border */}
      <div 
        className={cn(
          "absolute top-0 left-0 w-full h-1.5 transition-colors duration-300",
          !hasData ? "bg-muted" : isHealthy ? "bg-success" : "bg-destructive"
        )} 
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-foreground tracking-tight">
            {marker.name}
          </h3>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            Ref: {marker.refMin} - {marker.refMax} {marker.unit}
          </p>
        </div>
        
        {hasData && (
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm",
            isHealthy 
              ? "bg-success/10 text-success border border-success/20" 
              : "bg-destructive/10 text-destructive border border-destructive/20"
          )}>
            {isHealthy ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {isHealthy ? "In Range" : "Elevated"}
          </div>
        )}
      </div>

      {/* Main Value */}
      <div className="flex items-baseline gap-2 mb-6">
        <span className="text-4xl font-extrabold tracking-tighter text-foreground">
          {formatValue(currentValue)}
        </span>
        <span className="text-sm font-semibold text-muted-foreground mb-1">
          {marker.unit}
        </span>
      </div>

      {/* Footer Stats Grid */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50 mt-auto">
        
        {/* 3-Day Average & Trend */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            3-Day Avg
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">
              {formatValue(threedayAverage)}
            </span>
            <TrendIcon trend={threedayTrend} />
          </div>
        </div>

        {/* Deviation from Reference */}
        <div className="flex flex-col gap-1 items-end">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Vs Ref Range
          </span>
          <span className={cn(
            "text-sm font-bold",
            !hasData ? "text-muted-foreground" : isHealthy ? "text-success" : "text-destructive"
          )}>
            {formatPercent(percentFromRef)}
          </span>
        </div>
        
      </div>
    </motion.div>
  );
}

function TrendIcon({ trend }: { trend: MarkerDashboard['threedayTrend'] }) {
  switch (trend) {
    case 'up':
      return <ArrowUpRight className="w-4 h-4 text-destructive" strokeWidth={3} />;
    case 'down':
      return <ArrowDownRight className="w-4 h-4 text-success" strokeWidth={3} />;
    case 'stable':
      return <Minus className="w-4 h-4 text-muted-foreground" strokeWidth={3} />;
    case 'insufficient_data':
    default:
      return null;
  }
}
