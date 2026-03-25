import { useMemo } from "react";
import { useListReadings } from "@workspace/api-client-react";
import { MarkerDashboard } from "@workspace/api-client-react/src/generated/api.schemas";
import { format, parseISO } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";
import { Loader2 } from "lucide-react";

interface MarkerHistoryChartProps {
  dashboardData: MarkerDashboard[];
}

const COLORS = [
  "hsl(var(--primary))",
  "#f59e0b", // amber
  "#e11d48", // rose
  "#8b5cf6", // violet
  "#10b981", // emerald
  "#f97316", // orange
  "#0ea5e9", // sky
  "#ec4899", // pink
];

export function MarkerHistoryChart({ dashboardData }: MarkerHistoryChartProps) {
  const { data: readings, isLoading } = useListReadings();

  const { chartData, markerLines } = useMemo(() => {
    if (!readings || !readings.data || readings.data.length === 0) {
      return { chartData: [], markerLines: [] };
    }

    const markerMap = new Map(dashboardData.map(d => [d.marker.id, d.marker]));

    // Group readings by date
    const readingsByDate = new Map<string, Record<string, any>>();

    // Create lines only for markers that have readings
    const activeMarkers = new Set<number>();

    // Sort readings by date ascending
    const sortedReadings = [...readings.data].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );

    sortedReadings.forEach((reading) => {
      const marker = markerMap.get(reading.markerId);
      if (!marker) return;

      const dateStr = format(parseISO(reading.recordedAt), "MMM d");
      
      if (!readingsByDate.has(dateStr)) {
        readingsByDate.set(dateStr, { date: dateStr, sortKey: new Date(reading.recordedAt).getTime() });
      }

      const midpoint = (marker.refMin + marker.refMax) / 2;
      const halfRange = (marker.refMax - marker.refMin) / 2;
      
      let normalizedValue = 0;
      if (halfRange > 0) {
        normalizedValue = ((reading.value - midpoint) / halfRange) * 100;
      }

      const dayData = readingsByDate.get(dateStr)!;
      dayData[`marker_${marker.id}`] = normalizedValue;
      activeMarkers.add(marker.id);
    });

    const finalChartData = Array.from(readingsByDate.values()).sort((a, b) => a.sortKey - b.sortKey);

    const markerLines = Array.from(activeMarkers).map((id, index) => {
      const marker = markerMap.get(id);
      return {
        id: `marker_${id}`,
        name: marker?.name || `Marker ${id}`,
        color: COLORS[index % COLORS.length]
      };
    });

    return { chartData: finalChartData, markerLines };
  }, [readings, dashboardData]);

  if (isLoading) {
    return (
      <div className="w-full h-80 flex flex-col items-center justify-center glass-panel rounded-3xl mb-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="font-medium text-muted-foreground">Loading chart data...</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="w-full h-32 flex items-center justify-center glass-panel rounded-3xl mb-8 border-dashed border-2 border-border/60">
        <p className="text-muted-foreground text-sm font-medium">No readings yet — add your first reading to see the chart.</p>
      </div>
    );
  }

  return (
    <div className="w-full glass-panel rounded-3xl p-6 mb-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">Marker History (% from reference midpoint)</h2>
        <p className="text-sm text-muted-foreground">Values normalized to show relative deviation from the ideal center</p>
      </div>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickMargin={10}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tickFormatter={(value) => `${value}%`}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              domain={['auto', 'auto']}
            />
            <Tooltip 
              formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
              contentStyle={{ 
                borderRadius: '12px', 
                border: '1px solid hsl(var(--border))',
                backgroundColor: 'hsl(var(--card))',
                color: 'hsl(var(--card-foreground))',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
              }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            
            <ReferenceArea y1={-100} y2={100} fill="rgba(34,197,94,0.08)" />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" opacity={0.5} />
            <ReferenceLine y={100} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" opacity={0.5} />
            <ReferenceLine y={-100} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" opacity={0.5} />

            {markerLines.map(line => (
              <Line 
                key={line.id}
                type="monotone"
                dataKey={line.id}
                name={line.name}
                stroke={line.color}
                strokeWidth={2}
                dot={{ r: 4, fill: line.color, strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
