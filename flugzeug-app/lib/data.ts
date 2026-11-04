import type { SupabaseClient } from "@supabase/supabase-js";
import type { Aircraft } from "./types";
import { currentHours } from "./utils";

/**
 * Aktueller Stundenstand eines Flugzeugs: manuell gesetzt, sonst der
 * höchste Zählerstand aus dem Flugbuch dieses Flugzeugs.
 */
export async function fetchHours(supabase: SupabaseClient, aircraft: Aircraft): Promise<number> {
  if (aircraft.hours_override !== null && aircraft.hours_override !== undefined) {
    return Number(aircraft.hours_override);
  }
  const { data } = await supabase
    .from("flights")
    .select("hobbs")
    .eq("aircraft_id", aircraft.id)
    .not("hobbs", "is", null)
    .order("hobbs", { ascending: false })
    .limit(1);
  return currentHours(aircraft, data ?? []);
}
