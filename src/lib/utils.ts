import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatLapTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "--:--.---";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = Math.floor(ms % 1000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

export function parseLapTime(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const m = trimmed.match(/^(?:(\d+):)?(\d{1,2})(?:[.,](\d{1,3}))?$/);
  if (!m) return null;
  const minutes = m[1] ? parseInt(m[1], 10) : 0;
  const seconds = parseInt(m[2], 10);
  const millis = m[3] ? parseInt(m[3].padEnd(3, "0"), 10) : 0;
  if (seconds >= 60) return null;
  return minutes * 60000 + seconds * 1000 + millis;
}
