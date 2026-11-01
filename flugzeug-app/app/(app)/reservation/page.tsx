"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Plus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Reservation } from "@/lib/types";
import { MONTH_NAMES, WEEKDAYS, fmtDate, fmtTime, getMonthGrid, toKey } from "@/lib/utils";
import { Field } from "@/components/ui";

const emptyDraft = { start_time: "09:00", end_time: "10:00", pilot_name: "", purpose: "", note: "" };

export default function ReservationPage() {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState(toKey(now));
  const [items, setItems] = useState<Reservation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState<{ id: string; admin: boolean; name: string } | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("reservations").select("*").order("start_time");
    setItems((data as Reservation[]) ?? []);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        const { data: p } = await supabase.from("profiles").select("name, role").eq("id", auth.user.id).maybeSingle();
        setMe({ id: auth.user.id, admin: p?.role === "admin", name: p?.name ?? "" });
        setDraft((d) => ({ ...d, pilot_name: p?.name ?? "" }));
      }
      await load();
    })();
  }, [load]);

  const byDate = useMemo(() => {
    const m: Record<string, Reservation[]> = {};
    items.forEach((r) => (m[r.date] ||= []).push(r));
    return m;
  }, [items]);

  function changeMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setViewMonth(m);
    setViewYear(y);
  }

  async function add() {
    setError("");
    if (!draft.pilot_name.trim()) return setError("Bitte einen Namen angeben.");
    if (draft.end_time <= draft.start_time) return setError("Das Ende muss nach dem Beginn liegen.");
    setBusy(true);
    const { error } = await createClient().from("reservations").insert({
      date: selected,
      start_time: draft.start_time,
      end_time: draft.end_time,
      pilot_name: draft.pilot_name.trim(),
      purpose: draft.purpose || null,
      note: draft.note || null,
    });
    setBusy(false);
    if (error) return setError(error.message);
    setDraft({ ...emptyDraft, pilot_name: me?.name ?? "" });
    setShowForm(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Reservierung wirklich löschen?")) return;
    await createClient().from("reservations").delete().eq("id", id);
    load();
  }

  const days = getMonthGrid(viewYear, viewMonth);
  const todayKey = toKey(now);
  const list = byDate[selected] ?? [];

  return (
    <div className="reservation-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)", gap: 18 }}>
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <span className="display" style={{ fontSize: 18 }}>{MONTH_NAMES[viewMonth]} {viewYear}</span>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="btn btn-ghost" onClick={() => changeMonth(-1)} aria-label="Vorheriger Monat"><ChevronLeft size={16} /></button>
            <button className="btn btn-ghost" onClick={() => changeMonth(1)} aria-label="Nächster Monat"><ChevronRight size={16} /></button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
          {WEEKDAYS.map((w) => (
            <div key={w} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--ink-soft)" }}>{w}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {days.map((d, i) => {
            const key = toKey(d);
            const inMonth = d.getMonth() === viewMonth;
            const isToday = key === todayKey;
            const isSel = key === selected;
            const count = byDate[key]?.length ?? 0;
            return (
              <div
                key={i}
                onClick={() => setSelected(key)}
                style={{
                  aspectRatio: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  borderRadius: 7, cursor: "pointer", gap: 2,
                  background: isSel ? "var(--navy)" : isToday ? "var(--gold-soft)" : "transparent",
                  opacity: inMonth ? 1 : 0.32,
                }}
              >
                <span style={{ fontSize: 12.5, fontWeight: isToday ? 700 : 500, color: isSel ? "#fff" : "var(--ink)" }}>{d.getDate()}</span>
                {count > 0 && <span style={{ width: 5, height: 5, borderRadius: 999, background: isSel ? "var(--gold)" : "var(--brown)" }} />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div className="display" style={{ fontSize: 16 }}>{fmtDate(selected)}</div>
          <button className="btn" onClick={() => { setShowForm((s) => !s); setError(""); }}>
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "Abbrechen" : "Reservieren"}
          </button>
        </div>

        {showForm && (
          <div className="form-block">
            {error && <div className="error-box">{error}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <Field label="Von"><input type="time" className="input" value={draft.start_time} onChange={(e) => setDraft({ ...draft, start_time: e.target.value })} /></Field>
              <Field label="Bis"><input type="time" className="input" value={draft.end_time} onChange={(e) => setDraft({ ...draft, end_time: e.target.value })} /></Field>
            </div>
            <Field label="Name / Pilot"><input className="input" value={draft.pilot_name} onChange={(e) => setDraft({ ...draft, pilot_name: e.target.value })} /></Field>
            <Field label="Zweck"><input className="input" value={draft.purpose} onChange={(e) => setDraft({ ...draft, purpose: e.target.value })} placeholder="z.B. Rundflug, Schulung" /></Field>
            <Field label="Bemerkung"><input className="input" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /></Field>
            <button className="btn" disabled={busy} onClick={add} style={{ alignSelf: "flex-start" }}>
              <Check size={14} /> Reservierung speichern
            </button>
          </div>
        )}

        {list.length === 0 ? (
          <div className="empty">Keine Reservierungen an diesem Tag.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {list.map((r) => (
              <div key={r.id} className="row-item" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div>
                  <div className="mono" style={{ fontSize: 12.5, color: "var(--navy)", fontWeight: 600 }}>
                    {fmtTime(r.start_time)}–{fmtTime(r.end_time)}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{r.pilot_name}</div>
                  {r.purpose && <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{r.purpose}</div>}
                  {r.note && <div style={{ fontSize: 12, color: "var(--ink-soft)", fontStyle: "italic" }}>{r.note}</div>}
                </div>
                {(me?.admin || me?.id === r.user_id) && (
                  <button onClick={() => remove(r.id)} aria-label="Löschen" style={{ background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>
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
