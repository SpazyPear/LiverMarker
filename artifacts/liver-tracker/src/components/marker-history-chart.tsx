import { useMemo, useState, useEffect } from "react";
import { useListReadings } from "@workspace/api-client-react";
import type { MarkerDashboard, Marker } from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Loader2 } from "lucide-react";

interface EventMarker {
  id: number;
  eventDate: string;
  name: string;
  description?: string;
}

interface MarkerHistoryChartProps {
  dashboardData: MarkerDashboard[];
}

const COLORS = [
  "#3b82f6", // blue - ALT
  "#f59e0b", // amber - AST
  "#e11d48", // rose - GGT
  "#8b5cf6", // violet - Bilirubin
  "#10b981", // emerald - Albumin
  "#f97316", // orange - INR
  "#0ea5e9", // sky
  "#ec4899", // pink
];

function SingleMarkerChart({
  marker,
  readings,
  color,
  events,
}: {
  marker: Marker;
  readings: { date: string; value: number; sortKey: number }[];
  color: string;
  events: EventMarker[];
}) {
  if (readings.length === 0) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <div className="mb-2">
          <span className="text-sm font-bold text-foreground">{marker.name}</span>
          <span className="text-xs text-muted-foreground ml-2">{marker.unit}</span>
        </div>
        <div className="h-28 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">No readings yet</p>
        </div>
      </div>
    );
  }

  const values = readings.map((r) => r.value);
  const minVal = Math.min(...values, marker.refMin);
  const maxVal = Math.max(...values, marker.refMax);
  const padding = (maxVal - minVal) * 0.15 || 1;
  const yMin = Math.max(0, minVal - padding);
  const yMax = maxVal + padding;

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4">
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-sm font-bold text-foreground">{marker.name}</span>
        {marker.unit && (
          <span className="text-xs text-muted-foreground">{marker.unit}</span>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          Ref: {marker.refMin}–{marker.refMax}
        </span>
      </div>
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={readings} margin={{ top: 4, right: 4, left: -4, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${marker.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis
              dataKey="date"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              tickMargin={4}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickCount={4}
              tickFormatter={(v: number) => {
                if (Math.abs(v) >= 100) return Math.round(v).toString();
                if (Math.abs(v) >= 10) return parseFloat(v.toFixed(1)).toString();
                return parseFloat(v.toFixed(2)).toString();
              }}
              width={38}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "10px",
                border: "1px solid hsl(var(--border))",
                backgroundColor: "hsl(var(--card))",
                color: "hsl(var(--card-foreground))",
                fontSize: 12,
                padding: "6px 10px",
              }}
              formatter={(value: number) => [
                `${value} ${marker.unit}`,
                marker.name,
              ]}
              labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: 2 }}
            />
            {/* Faded reference range band */}
            <ReferenceArea
              y1={marker.refMin}
              y2={marker.refMax}
              fill="rgba(34,197,94,0.12)"
              stroke="rgba(34,197,94,0.3)"
              strokeWidth={1}
            />
            {/* Event markers as vertical lines */}
            {events.map((event) => (
              <ReferenceLine
                key={event.id}
                x={format(parseISO(event.eventDate), "MMM d")}
                stroke="rgba(168, 85, 247, 0.3)"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            ))}
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#grad-${marker.id})`}
              dot={{ r: 3, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function MarkerHistoryChart({ dashboardData }: MarkerHistoryChartProps) {
  const { data: readings, isLoading } = useListReadings();
  const [events, setEvents] = useState<EventMarker[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch("/api/events");
        if (response.ok) {
          const data = await response.json();
          setEvents(data);
        }
      } catch (error) {
        console.error("Failed to fetch events:", error);
      } finally {
        setEventsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const markerChartData = useMemo(() => {
    if (!readings || readings.length === 0) return [];

    return dashboardData.map((d) => {
      const markerReadings = readings
        .filter((r) => r.markerId === d.marker.id)
        .map((r) => ({
          date: format(parseISO(r.recordedAt), "MMM d"),
          value: r.value,
          sortKey: new Date(r.recordedAt).getTime(),
        }))
        .sort((a, b) => a.sortKey - b.sortKey);

      return { marker: d.marker, readings: markerReadings };
    });
  }, [readings, dashboardData]);

  if (isLoading || eventsLoading) {
    return (
      <div className="w-full rounded-2xl border border-border/50 bg-card p-6 mb-8 flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-3" />
        <p className="font-medium text-muted-foreground text-sm">Loading chart data...</p>
      </div>
    );
  }

  const hasAnyReadings = markerChartData.some((m) => m.readings.length > 0);

  if (!hasAnyReadings) {
    return (
      <div className="w-full h-28 flex items-center justify-center rounded-2xl border-dashed border-2 border-border/60 mb-8">
        <p className="text-muted-foreground text-sm font-medium">
          No readings yet — add your first reading to see the chart.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full mb-8">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-foreground">Marker History</h2>
        <p className="text-sm text-muted-foreground">
          Shaded green band = reference range · Purple dashed line = event marker
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {markerChartData.map(({ marker, readings }, index) => (
          <SingleMarkerChart
            key={marker.id}
            marker={marker}
            readings={readings}
            color={COLORS[index % COLORS.length]}
            events={events}
          />
        ))}
      </div>
    </div>
  );
}
