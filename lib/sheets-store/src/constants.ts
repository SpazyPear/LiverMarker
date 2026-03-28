/** Default spreadsheet if `GOOGLE_SHEETS_SPREADSHEET_ID` is unset. */
export const DEFAULT_SPREADSHEET_ID = "1mmMO7WEqTq2tRCL8Z0SAgBJV2_fWjgSn6BtcgkvQCmg";

export const TAB_MARKERS = "Markers";
export const TAB_READINGS = "Readings";
export const TAB_EVENTS = "Events";

export const HEADERS_MARKERS = ["id", "name", "unit", "refMin", "refMax", "createdAt"] as const;
export const HEADERS_READINGS = ["id", "markerId", "value", "recordedAt"] as const;
export const HEADERS_EVENTS = ["id", "eventDate", "name", "description", "createdAt"] as const;
