"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Check, Plus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Flight } from "@/lib/types";
import { fmtDate, toKey } from "@/lib/utils";
import { Field, SectionTitle, StatCard } from "@/components/ui";

function emptyDraft(pilot = "") {
  return { date: toKey(new Date()), pilot, dep: "", dest: "", dep_time: "", arr_time: "", duration: "", landings: "1", hobbs: "", note: "" };
}

export default function FlugbuchPage() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(emptyDraft());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState<{ id: string; admin: boolean; name: string } | null>(null);

  const load = useCallback(async () => {
    const { data } = await createClient().from("flights").select("*").order("date", { ascending: false }).order("created_at", { ascending: false });
    setFlights((data as Flight[]) ?? []);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        const { data: p } = await supabase.from("profiles").select("name, role").eq("id", auth.user.id).maybeSingle();
        setMe({ id: auth.user.id, admin: p?.role === "admin", name: p?.name ?? "" });
        setDraft(emptyDraft(p?.name ?? ""));
      }
      await load();
    })();
  }, [load]);

  const totalHours = flights.reduce((s, f) => s + Number(f.duration || 0), 0);
  const totalLandings = flights.reduce((s, f) => s + Number(f.landings || 0), 0);

  async function add() {
    setError("");
    if (!draft.pilot.trim()) return setError("Bitte den Piloten angeben.");
    if (draft.duration === "" || Number(draft.duration) < 0) return setError("Bitte die Flugzeit in Stunden angeben (z.B. 1.2).");
    setBusy(true);
    const { error } = await createClient().from("flights").insert({
      date: draft.date,
      pilot: draft.pilot.trim(),
      dep: draft.dep || null,
      dest: draft.dest || null,
      dep_time: draft.dep_time || null,
      arr_time: draft.arr_time || null,
      duration: Number(draft.duration),
      landings: Number(draft.landings || 0),
      hobbs: draft.hobbs === "" ? null : Number(draft.hobbs),
      note: draft.note || null,
    });
    setBusy(false);
    if (error) return setError(error.message);
    setDraft(emptyDraft(me?.name ?? ""));
    setShowForm(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Flug wirklich löschen?")) return;
    await createClient().from("flights").delete().eq("id", id);
    load();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 12 }}>
        <StatCard label="Gesamtflugzeit (erfasst)" value={`${totalHours.toFixed(1)} h`} />
        <StatCard label="Flüge erfasst" value={String(flights.length)} />
        <StatCard label="Landungen total" value={String(totalLandings)} />
      </div>

      <div className="card">
        <SectionTitle
          icon={BookOpen}
          action={
            <button className="btn" onClick={() => { setShowForm((s) => !s); setError(""); }}>
              {showForm ? <X size={14} /> : <Plus size={14} />}
              {showForm ? "Abbrechen" : "Neuer Flug"}
            </button>
          }
        >
          Flugbuch
        </SectionTitle>

        {showForm && (
          <div className="form-block">
            {error && <div className="error-box">{error}</div>}
            <div className="grid-auto">
              <Field label="Datum"><input type="date" className="input" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></Field>
              <Field label="Pilot"><input className="input" value={draft.pilot} onChange={(e) => setDraft({ ...draft, pilot: e.target.value })} /></Field>
              <Field label="Von"><input className="input" value={draft.dep} onChange={(e) => setDraft({ ...draft, dep: e.target.value.toUpperCase() })} placeholder="z.B. LSZH" /></Field>
              <Field label="Nach"><input className="input" value={draft.dest} onChange={(e) => setDraft({ ...draft, dest: e.target.value.toUpperCase() })} placeholder="z.B. LSZR" /></Field>
            </div>
            <div className="grid-auto">
              <Field label="Abflugzeit"><input type="time" className="input" value={draft.dep_time} onChange={(e) => setDraft({ ...draft, dep_time: e.target.value })} /></Field>
              <Field label="Ankunftzeit"><input type="time" className="input" value={draft.arr_time} onChange={(e) => setDraft({ ...draft, arr_time: e.target.value })} /></Field>
              <Field label="Flugzeit (h)"><input type="number" step="0.1" min="0" className="input" value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: e.target.value })} placeholder="1.2" /></Field>
              <Field label="Landungen"><input type="number" min="0" className="input" value={draft.landings} onChange={(e) => setDraft({ ...draft, landings: e.target.value })} /></Field>
            </div>
            <Field label="Zählerstand (Ende Flug)"><input type="number" step="0.1" className="input" value={draft.hobbs} onChange={(e) => setDraft({ ...draft, hobbs: e.target.value })} placeholder="z.B. 1234.5" /></Field>
            <Field label="Bemerkungen"><input className="input" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /></Field>
            <button className="btn" disabled={busy} onClick={add} style={{ alignSelf: "flex-start" }}>
              <Check size={14} /> Flug speichern
            </button>
          </div>
        )}

        {flights.length === 0 ? (
          <div className="empty">Noch keine Flüge erfasst.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {flights.map((f) => (
              <div key={f.id} className="row-item" style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                    <span className="mono" style={{ fontSize: 12.5, color: "var(--navy)", fontWeight: 600 }}>{fmtDate(f.date)}</span>
                    <span style={{ fontWeight: 600, fontSize: 13.5 }}>{f.pilot}</span>
                    {(f.dep || f.dest) && <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{f.dep} → {f.dest}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>
                    {Number(f.duration)} h · {f.landings} Ldg
                    {f.hobbs !== null ? ` · Zählerstand ${Number(f.hobbs)} h` : ""}
                    {f.note ? ` · ${f.note}` : ""}
                  </div>
                </div>
                {(me?.admin || me?.id === f.user_id) && (
                  <button onClick={() => remove(f.id)} aria-label="Löschen" style={{ background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>
                    <Trash2 size={15} color="var(--red)" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
