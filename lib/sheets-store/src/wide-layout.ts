/** When set to `wide`, the spreadsheet uses one lab grid tab (dates as columns) instead of Markers/Readings tabs. */
export function isWideLayout(): boolean {
  return process.env.GOOGLE_SHEETS_LAYOUT?.trim().toLowerCase() === "wide";
}

/** Tab title containing the wide lab table (default first-sheet name). */
export function getWideTabName(): string {
  return process.env.GOOGLE_SHEETS_WIDE_TAB?.trim() || "Sheet1";
}
