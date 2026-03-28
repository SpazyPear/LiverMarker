export interface SheetMarker {
  id: number;
  name: string;
  unit: string;
  refMin: number;
  refMax: number;
  createdAt: string;
}

export interface SheetReading {
  id: number;
  markerId: number;
  value: number;
  recordedAt: string;
}

export interface SheetEvent {
  id: number;
  eventDate: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export type MarkerDashboardThreedayTrend = "up" | "down" | "stable" | "insufficient_data";

export interface SheetMarkerDashboard {
  marker: SheetMarker;
  currentValue: number | null;
  threedayAverage: number | null;
  threedayTrend: MarkerDashboardThreedayTrend;
  percentFromRef: number | null;
}
