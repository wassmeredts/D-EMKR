"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Settings, Trash2, UserCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Aircraft, Profile } from "@/lib/types";
import { Badge, Field, SectionTitle } from "@/components/ui";

export default function EinstellungenPage() {
  const router = useRouter();
  const [aircraft, setAircraft] = useState({ registration: "", type: "", hours_override: "" });
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [meId, setMeId] = useState("");
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    setMeId(auth.user?.id ?? "");
    const [{ data: ac }, { data: pr }] = await Promise.all([
      supabase.from("aircraft").select("*").eq("id", 1).maybeSingle(),
      supabase.from("profiles").select("*").order("created_at"),
    ]);
    const a = ac as Aircraft | null;
    if (a) setAircraft({ registration: a.registration, type: a.type, hours_override: a.hours_override === null ? "" : String(a.hours_override) });
    const list = (pr as Profile[]) ?? [];
    setProfiles(list);
    setAllowed(list.find((p) => p.id === auth.user?.id)?.role === "admin");
  }, []);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  async function saveAircraft() {
    setMsg(""); setError("");
    const { error } = await createClient().from("aircraft").update({
      registration: aircraft.registration.trim(),
      type: aircraft.type.trim(),
      hours_override: aircraft.hours_override === "" ? null : Number(aircraft.hours_override),
    }).eq("id", 1);
    if (error) return setError(error.message);
    setMsg("Gespeichert.");
    router.refresh();
  }

  async function setApproved(id: string, approved: boolean) {
    await createClient().from("profiles").update({ approved }).eq("id", id);
    load();
  }
  async function setRole(id: string, role: "admin" | "pilot") {
    await createClient().from("profiles").update({ role }).eq("id", id);
    load();
  }
  async function removeProfile(id: string) {
    if (!confirm("Dieses Profil wirklich entfernen? Die Person kann sich danach nicht mehr einloggen und sieht keine Daten.")) return;
    await createClient().from("profiles").delete().eq("id", id);
    load();
  }

  if (allowed === null) return <div className="empty">Lade…</div>;
  if (!allowed) return <div className="card">Dieser Bereich ist nur für Administratoren.</div>;

  const pending = profiles.filter((p) => !p.approved);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="card">
        <SectionTitle icon={Settings}>Flugzeug</SectionTitle>
        {error && <div className="error-box" style={{ marginBottom: 10 }}>{error}</div>}
        {msg && <div className="info-box" style={{ marginBottom: 10 }}>{msg}</div>}
        <div className="grid-auto" style={{ marginBottom: 12 }}>
          <Field label="Kennzeichen"><input className="input" value={aircraft.registration} onChange={(e) => setAircraft({ ...aircraft, registration: e.target.value })} /></Field>
          <Field label="Typ"><input className="input" value={aircraft.type} onChange={(e) => setAircraft({ ...aircraft, type: e.target.value })} /></Field>
          <Field label="Stundenstand manuell">
            <input type="number" step="0.1" className="input" value={aircraft.hours_override} onChange={(e) => setAircraft({ ...aircraft, hours_override: e.target.value })} placeholder="leer = aus Flugbuch" />
          </Field>
        </div>
        <button className="btn" onClick={saveAircraft}><Check size={14} /> Speichern</button>
        <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 0 }}>
          Ist kein Stundenstand gesetzt, gilt der höchste Zählerstand aus dem Flugbuch.
        </p>
      </div>

      <div className="card">
        <SectionTitle icon={UserCheck}>Benutzer {pending.length > 0 && <Badge tone="warn">{pending.length} warten auf Freigabe</Badge>}</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {profiles.map((p) => (
            <div key={p.id} className="row-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name || "—"}</div>
                <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{p.email}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <Badge tone={p.approved ? "ok" : "warn"}>{p.approved ? "Freigegeben" : "Wartet"}</Badge>
                  <Badge tone="ink">{p.role === "admin" ? "Administrator" : "Pilot"}</Badge>
                </div>
              </div>
              {p.id !== meId && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {!p.approved ? (
                    <button className="btn btn-ok" onClick={() => setApproved(p.id, true)}><Check size={13} /> Freigeben</button>
                  ) : (
                    <button className="btn btn-outline" onClick={() => setApproved(p.id, false)}>Sperren</button>
                  )}
                  <button className="btn btn-outline" onClick={() => setRole(p.id, p.role === "admin" ? "pilot" : "admin")}>
                    {p.role === "admin" ? "Zum Piloten machen" : "Zum Admin machen"}
                  </button>
                  <button className="btn btn-danger" onClick={() => removeProfile(p.id)} aria-label="Entfernen"><Trash2 size={13} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
