"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAircraft } from "@/components/AircraftContext";
import type { Aircraft, Part, Reservation } from "@/lib/types";
import { fmtDate, fmtTime, getPartStatus, toKey } from "@/lib/utils";
import { Badge, SectionTitle } from "@/components/ui";

type Row = {
  ac: Aircraft;
  hours: number;
  next: Reservation | null;
  openDefects: number;
  criticalDefects: number;
  dueParts: number;
  overdueParts: number;
};

export default function FlottePage() {
  const { list, current } = useAircraft();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (list.length === 0) return;
    const supabase = createClient();
    (async () => {
      const today = toKey(new Date());
      const [fl, rs, df, pt] = await Promise.all([
        supabase.from("flights").select("aircraft_id, hobbs").not("hobbs", "is", null),
        supabase.from("reservations").select("*").gte("date", today).order("date").order("start_time"),
        supabase.from("defects").select("aircraft_id, severity").neq("status", "behoben"),
        supabase.from("parts").select("*"),
      ]);

      const topHobbs = new Map<number, number>();
      (fl.data ?? []).forEach((f: { aircraft_id: number; hobbs: number }) => {
        topHobbs.set(f.aircraft_id, Math.max(topHobbs.get(f.aircraft_id) ?? 0, Number(f.hobbs)));
      });

      setRows(
        list.map((ac) => {
          const hours =
            ac.hours_override !== null && ac.hours_override !== undefined
              ? Number(ac.hours_override)
              : topHobbs.get(ac.id) ?? 0;
          const defects = (df.data ?? []).filter((d: { aircraft_id: number }) => d.aircraft_id === ac.id);
          const statuses = ((pt.data as Part[]) ?? [])
            .filter((p) => p.aircraft_id === ac.id)
            .map((p) => getPartStatus(p, hours).status);
          return {
            ac,
            hours,
            next: ((rs.data as Reservation[]) ?? []).find((r) => r.aircraft_id === ac.id) ?? null,
            openDefects: defects.length,
            criticalDefects: defects.filter((d: { severity: string }) => d.severity === "kritisch").length,
            dueParts: statuses.filter((s) => s !== "ok").length,
            overdueParts: statuses.filter((s) => s === "overdue").length,
          };
        })
      );
    })();
  }, [list]);

  return (
    <div className="card">
      <SectionTitle icon={Layers}>Alle Flugzeuge</SectionTitle>
      {rows === null ? (
        <div className="empty">Lade Daten…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          {rows.map((r) => (
            <Link
              key={r.ac.id}
              href={`/?f=${r.ac.id}`}
              className="row-item"
              style={{
                textDecoration: "none",
                color: "inherit",
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                borderColor: current?.id === r.ac.id ? "var(--navy)" : undefined,
                borderWidth: current?.id === r.ac.id ? 2 : undefined,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <div>
                  <div className="display" style={{ fontSize: 22, fontWeight: 600 }}>{r.ac.registration}</div>
                  <div className="mono" style={{ fontSize: 12, color: "var(--ink-soft)" }}>{r.ac.type || "—"}</div>
                </div>
                <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: "var(--navy)" }}>
                  {r.hours.toFixed(1)} h
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
                Nächste Reservierung:{" "}
                <b style={{ color: "var(--ink)" }}>
                  {r.next ? `${fmtDate(r.next.date)} · ${fmtTime(r.next.start_time)}` : "keine geplant"}
                </b>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Badge tone={r.criticalDefects ? "overdue" : r.openDefects ? "warn" : "ok"}>
                  {r.openDefects === 0
                    ? "Keine offenen Mängel"
                    : `${r.openDefects} offene${r.openDefects === 1 ? "r" : ""} Mangel${r.openDefects === 1 ? "" : "e"}`}
                </Badge>
                <Badge tone={r.overdueParts ? "overdue" : r.dueParts ? "warn" : "ok"}>
                  {r.dueParts === 0 ? "Wartung in Ordnung" : `${r.dueParts} Teil${r.dueParts === 1 ? "" : "e"} fällig`}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
