"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Plus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Defect, DefectStatus, Severity } from "@/lib/types";
import { fmtDate, toKey } from "@/lib/utils";
import { Badge, Field, SectionTitle } from "@/components/ui";

const SEVERITIES: Record<Severity, string> = { gering: "Gering", mittel: "Mittel", kritisch: "Kritisch" };
const SEV_TONE: Record<Severity, "ok" | "warn" | "overdue"> = { gering: "ok", mittel: "warn", kritisch: "overdue" };
const STATUS_LABEL: Record<DefectStatus, string> = { offen: "Offen", bearbeitung: "In Bearbeitung", behoben: "Behoben" };
const STATUS_TONE: Record<DefectStatus, "ok" | "warn" | "overdue"> = { offen: "overdue", bearbeitung: "warn", behoben: "ok" };

type Filter = "offen" | "alle" | "behoben";

export default function MaengelPage() {
  const [defects, setDefects] = useState<Defect[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<Filter>("offen");
  const [draft, setDraft] = useState({ date: toKey(new Date()), description: "", severity: "mittel" as Severity, reported_by: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const load = useCallback(async () => {
    const { data } = await createClient().from("defects").select("*").order("date", { ascending: false }).order("created_at", { ascending: false });
    setDefects((data as Defect[]) ?? []);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        const { data: p } = await supabase.from("profiles").select("name, role").eq("id", auth.user.id).maybeSingle();
        setIsAdmin(p?.role === "admin");
        setDraft((d) => ({ ...d, reported_by: p?.name ?? "" }));
      }
      await load();
    })();
  }, [load]);

  async function add() {
    setError("");
    if (!draft.description.trim()) return setError("Bitte den Mangel beschreiben.");
    setBusy(true);
    const { error } = await createClient().from("defects").insert({
      date: draft.date,
      description: draft.description.trim(),
      severity: draft.severity,
      reported_by: draft.reported_by || null,
    });
    setBusy(false);
    if (error) return setError(error.message);
    setDraft({ ...draft, description: "", severity: "mittel" });
    setShowForm(false);
    load();
  }

  async function setStatus(id: string, status: DefectStatus) {
    await createClient()
      .from("defects")
      .update({ status, resolved_date: status === "behoben" ? toKey(new Date()) : null })
      .eq("id", id);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Mangel wirklich löschen?")) return;
    await createClient().from("defects").delete().eq("id", id);
    load();
  }

  const filtered = defects.filter((d) =>
    filter === "alle" ? true : filter === "offen" ? d.status !== "behoben" : d.status === "behoben"
  );

  return (
    <div className="card">
      <SectionTitle
        icon={AlertTriangle}
        action={
          <button className="btn" onClick={() => { setShowForm((s) => !s); setError(""); }}>
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "Abbrechen" : "Mangel melden"}
          </button>
        }
      >
        Mängelliste
      </SectionTitle>

      {showForm && (
        <div className="form-block">
          {error && <div className="error-box">{error}</div>}
          <Field label="Beschreibung">
            <textarea className="input" style={{ minHeight: 70 }} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Was wurde festgestellt?" />
          </Field>
          <div className="grid-auto">
            <Field label="Datum"><input type="date" className="input" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></Field>
            <Field label="Schweregrad">
              <select className="input" value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: e.target.value as Severity })}>
                {Object.entries(SEVERITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Gemeldet von"><input className="input" value={draft.reported_by} onChange={(e) => setDraft({ ...draft, reported_by: e.target.value })} /></Field>
          </div>
          <button className="btn" disabled={busy} onClick={add} style={{ alignSelf: "flex-start" }}>
            <Check size={14} /> Mangel speichern
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {(["offen", "alle", "behoben"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              border: "1px solid var(--border)", borderRadius: 999, padding: "5px 13px", fontSize: 12, fontWeight: 600, cursor: "pointer", font: "inherit",
              background: filter === f ? "var(--navy)" : "transparent",
              color: filter === f ? "#fff" : "var(--ink-soft)",
            }}
          >
            {f === "offen" ? "Offen" : f === "alle" ? "Alle" : "Behoben"}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">Keine Einträge.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((d) => (
            <div key={d.id} className="row-item" style={{ padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Badge tone={SEV_TONE[d.severity]}>{SEVERITIES[d.severity]}</Badge>
                  <Badge tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</Badge>
                </div>
                {isAdmin && (
                  <button onClick={() => remove(d.id)} aria-label="Löschen" style={{ background: "none", border: "none", cursor: "pointer" }}>
                    <Trash2 size={15} color="var(--red)" />
                  </button>
                )}
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, marginTop: 8 }}>{d.description}</div>
              <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>
                Gemeldet {fmtDate(d.date)}
                {d.reported_by ? ` von ${d.reported_by}` : ""}
                {d.status === "behoben" && d.resolved_date ? ` · Behoben am ${fmtDate(d.resolved_date)}` : ""}
              </div>
              {d.status !== "behoben" && (
                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                  {d.status === "offen" && (
                    <button className="btn btn-outline" onClick={() => setStatus(d.id, "bearbeitung")}>In Bearbeitung setzen</button>
                  )}
                  <button className="btn btn-ok" onClick={() => setStatus(d.id, "behoben")}>
                    <Check size={13} /> Als behoben markieren
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
