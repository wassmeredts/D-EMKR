import type { SupabaseClient } from "@supabase/supabase-js";
import type { Aircraft } from "./types";
import { currentHours } from "./utils";

/** Lädt Flugzeugdaten und den aktuellen Stundenstand. */
export async function fetchAircraftAndHours(supabase: SupabaseClient) {
  const [{ data: aircraft }, { data: flights }] = await Promise.all([
    supabase.from("aircraft").select("*").eq("id", 1).maybeSingle(),
    supabase.from("flights").select("hobbs").not("hobbs", "is", null),
  ]);
  const ac = (aircraft as Aircraft | null) ?? null;
  return { aircraft: ac, hours: currentHours(ac, flights ?? []) };
}
