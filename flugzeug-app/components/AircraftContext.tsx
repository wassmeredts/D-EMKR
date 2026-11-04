"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchHours } from "@/lib/data";
import type { Aircraft } from "@/lib/types";

const STORAGE_KEY = "flugzeug-app:aircraft";

type AircraftState = {
  /** Alle Flugzeuge (sortiert nach Kennzeichen) */
  list: Aircraft[];
  /** Das gerade gewählte Flugzeug (null, solange keines angelegt ist) */
  current: Aircraft | null;
  /** Aktueller Stundenstand des gewählten Flugzeugs */
  hours: number;
  /** false, solange die Flugzeugliste noch geladen wird */
  ready: boolean;
  /** Anderes Flugzeug wählen (bleibt im gleichen Bereich) */
  select: (id: number) => void;
  /** Hängt das gewählte Flugzeug an einen Pfad, z.B. href("/flugbuch") */
  href: (path: string) => string;
  /** Stundenstand neu berechnen (nach Änderungen im Flugbuch) */
  refresh: () => Promise<void>;
  /** Flugzeugliste neu laden (nach Anlegen/Ändern/Löschen) */
  reload: () => Promise<void>;
};

const Ctx = createContext<AircraftState | null>(null);

export function useAircraft(): AircraftState {
  const value = useContext(Ctx);
  if (!value) throw new Error("useAircraft muss innerhalb von AircraftProvider verwendet werden");
  return value;
}

export function AircraftProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [list, setList] = useState<Aircraft[]>([]);
  const [ready, setReady] = useState(false);
  const [hours, setHours] = useState(0);
  const [stored] = useState<number | null>(() => {
    try {
      return Number(localStorage.getItem(STORAGE_KEY)) || null;
    } catch {
      return null;
    }
  });

  // Reihenfolge: Adresse (?f=…) vor zuletzt benutztem Flugzeug vor dem ersten der Liste
  const paramId = Number(params.get("f")) || null;
  const current = useMemo(
    () =>
      list.find((a) => a.id === paramId) ??
      list.find((a) => a.id === stored) ??
      list[0] ??
      null,
    [list, paramId, stored]
  );

  useEffect(() => {
    if (!current) return;
    try {
      localStorage.setItem(STORAGE_KEY, String(current.id));
    } catch {
      /* Speicher nicht verfügbar: dann merkt sich die App die Auswahl nur in der Adresse */
    }
  }, [current]);

  const reload = useCallback(async () => {
    const { data } = await createClient().from("aircraft").select("*").order("registration");
    setList((data as Aircraft[]) ?? []);
    setReady(true);
  }, []);

  useEffect(() => {
    (async () => {
      await reload();
    })();
  }, [reload]);

  const refresh = useCallback(async () => {
    if (!current) {
      setHours(0);
      return;
    }
    setHours(await fetchHours(createClient(), current));
  }, [current]);

  useEffect(() => {
    (async () => {
      await refresh();
    })();
  }, [refresh]);

  const select = useCallback(
    (id: number) => {
      router.push(`${pathname}?f=${id}`);
    },
    [router, pathname]
  );

  const href = useCallback(
    (path: string) => (current ? `${path}?f=${current.id}` : path),
    [current]
  );

  const value = useMemo(
    () => ({ list, current, hours, ready, select, href, refresh, reload }),
    [list, current, hours, ready, select, href, refresh, reload]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
