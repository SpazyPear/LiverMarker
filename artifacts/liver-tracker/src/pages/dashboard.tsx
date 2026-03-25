import { Loader2, ActivitySquare } from "lucide-react";
import Layout from "@/components/layout";
import { DashboardCard } from "@/components/dashboard-card";
import { AddReadingsSheet } from "@/components/add-readings-sheet";
import { useDashboardData } from "@/hooks/use-dashboard";

export default function Dashboard() {
  const { data: dashboardData, isLoading, error } = useDashboardData();

  return (
    <Layout>
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Health Overview
        </h1>
        <p className="text-muted-foreground">
          Track your liver enzyme levels and monitor trends over time.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="font-medium">Loading your health data...</p>
        </div>
      ) : error ? (
        <div className="bg-destructive/10 text-destructive p-6 rounded-2xl border border-destructive/20 flex items-center justify-center">
          <p className="font-semibold">Failed to load dashboard data. Please try again.</p>
        </div>
      ) : !dashboardData || dashboardData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center glass-panel rounded-3xl border-dashed border-2 border-border/60">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary">
            <ActivitySquare className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">No markers tracked yet</h2>
          <p className="text-muted-foreground max-w-md mb-8">
            Start by adding some markers in the settings, or log your first reading if markers are already configured.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardData.map((data, index) => (
            <DashboardCard key={data.marker.id} data={data} index={index} />
          ))}
        </div>
      )}

      <AddReadingsSheet />
    </Layout>
  );
}
