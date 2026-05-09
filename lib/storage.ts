import type { ComparisonSnapshot } from "./types";

export const STORAGE_KEY = "city-budget-comparison-v1";

export function loadSnapshot(): ComparisonSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ComparisonSnapshot;
    if (!parsed || parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSnapshot(snapshot: ComparisonSnapshot): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}
