import type { Aircraft, Flight, Part, PartStatus } from "./types";

export const MONTH_NAMES = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];
export const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export function fmtTime(t: string | null | undefined): string {
  return t ? t.slice(0, 5) : "";
}

export function addMonths(iso: string, months: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return toKey(d);
}

export function getMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Montag = 0
  const gridStart = new Date(year, month, 1 - startOffset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

/** Aktueller Stundenstand: manuell gesetzt, sonst höchster Zählerstand im Flugbuch. */
export function currentHours(aircraft: Aircraft | null, flights: Pick<Flight, "hobbs">[]): number {
  if (aircraft?.hours_override !== null && aircraft?.hours_override !== undefined) {
    return Number(aircraft.hours_override);
  }
  const values = flights.map((f) => Number(f.hobbs) || 0);
  return values.length ? Math.max(0, ...values) : 0;
}

export function getPartStatus(part: Part, hours: number): PartStatus {
  const interval = Number(part.interval_value) || 0;

  if (part.interval_type === "stunden") {
    const last = parseFloat(part.last_value) || 0;
    const due = last + interval;
    const remaining = due - hours;
    const percent = interval > 0 ? (remaining / interval) * 100 : 0;
    return {
      dueLabel: `${due.toFixed(1)} h`,
      remainingLabel:
        remaining >= 0
          ? `${remaining.toFixed(1)} h übrig`
          : `${Math.abs(remaining).toFixed(1)} h überfällig`,
      percent,
      status: remaining <= 0 ? "overdue" : percent <= 25 ? "warn" : "ok",
    };
  }

  const due = addMonths(part.last_value, interval);
  const today = new Date(toKey(new Date()) + "T00:00:00");
  const remainingDays = Math.round(
    (new Date(due + "T00:00:00").getTime() - today.getTime()) / 86400000
  );
  const intervalDays = interval * 30.44;
  const percent = intervalDays > 0 ? (remainingDays / intervalDays) * 100 : 0;
  return {
    dueLabel: fmtDate(due),
    remainingLabel:
      remainingDays >= 0
        ? `${remainingDays} Tage übrig`
        : `${Math.abs(remainingDays)} Tage überfällig`,
    percent,
    status: remainingDays <= 0 ? "overdue" : percent <= 25 ? "warn" : "ok",
  };
}
