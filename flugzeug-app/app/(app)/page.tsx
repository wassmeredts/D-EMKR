"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAircraft } from "@/components/AircraftContext";
import type { Defect, Part, Reservation } from "@/lib/types";
import { fmtDate, fmtTime, getPartStatus, toKey } from "@/lib/utils";
import { Badge, Gauge, SectionTitle, StatCard } from "@/components/ui";

export default function OverviewPage() {
  const { current, hours, href } = useAircraft();
  const aid = current!.id;

  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState<Reservation[]>([]);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [parts, setParts] = useState<Part[]>([]);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const today = toKey(new Date());
      const [r, d, p] = await Promise.all([
        supabase
          .from("reservations")
          .select("*")
          .eq("aircraft_id", aid)
          .gte("date", today)
          .order("date")
          .order("start_time")
          .limit(3),
        supabase.from("defects").select("*").eq("aircraft_id", aid).neq("status", "behoben"),
        supabase.from("parts").select("*").eq("aircraft_id", aid),
      ]);
      setUpcoming((r.data as Reservation[]) ?? []);
      setDefects((d.data as Defect[]) ?? []);
      setParts((p.data as Part[]) ?? []);
      setLoading(false);
    })();
  }, [aid]);

  if (loading) return <div className="empty">Lade Daten…</div>;

  const critical = defects.filter((d) => d.severity === "kritisch");
  const partStatuses = parts
    .map((p) => ({ p, s: getPartStatus(p, hours) }))
    .sort((a, b) => a.s.percent - b.s.percent);
  const urgent = partStatuses.filter((x) => x.s.status !== "ok");
  const overdue = urgent.filter((x) => x.s.status === "overdue");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        <StatCard
          label="Nächste Reservierung"
          value={upcoming[0] ? `${fmtDate(upcoming[0].date)} · ${fmtTime(upcoming[0].start_time)}` : "Keine geplant"}
          href={href("/reservation")}
        />
        <StatCard
          label="Offene Mängel"
          value={String(defects.length)}
          tone={critical.length ? "overdue" : defects.length ? "warn" : "ok"}
          href={href("/maengel")}
        />
        <StatCard
          label="Teile fällig / bald fällig"
          value={String(urgent.length)}
          tone={overdue.length ? "overdue" : urgent.length ? "warn" : "ok"}
          href={href("/wartung")}
        />
      </div>

      {(critical.length > 0 || overdue.length > 0) && (
        <div className="card" style={{ borderColor: "var(--red)", background: "var(--red-soft)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <AlertTriangle size={16} color="var(--red)" />
            <span className="display" style={{ fontWeight: 600, color: "var(--red)" }}>
              Achtung – Handlungsbedarf
            </span>
          </div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, lineHeight: 1.7 }}>
            {critical.map((d) => (
              <li key={d.id}>Kritischer Mangel: {d.description}</li>
            ))}
            {overdue.map((x) => (
              <li key={x.p.id}>
                {x.p.name} ist überfällig ({x.s.remainingLabel})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <SectionTitle
          icon={Wrench}
          action={
            <Link href={href("/wartung")} className="btn btn-ghost">
              Alle Teile →
            </Link>
          }
        >
          Wartungsstatus
        </SectionTitle>
        {partStatuses.length === 0 ? (
          <div className="empty">Noch keine Teile mit Laufzeit erfasst.</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {partStatuses.slice(0, 4).map(({ p, s }) => (
              <div
                key={p.id}
                className="row-item"
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px 6px 6px" }}
              >
                <Gauge percent={s.percent} status={s.status} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{p.name}</div>
                  <Badge tone={s.status}>{s.remainingLabel}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
