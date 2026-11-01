"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ChevronDown, ChevronUp, Pencil, Plus, Trash2, Wrench, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchAircraftAndHours } from "@/lib/data";
import type { Part, PartHistory } from "@/lib/types";
import { fmtDate, getPartStatus, toKey } from "@/lib/utils";
import { Badge, Field, Gauge, SectionTitle } from "@/components/ui";

const emptyDraft = { name: "", interval_type: "stunden" as "stunden" | "kalender", interval_value: "", last_value: "", note: "" };

export default function WartungPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [history, setHistory] = useState<PartHistory[]>([]);
  const [hours, setHours] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [myName, setMyName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [editId, setEditId] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);
  const [doneNote, setDoneNote] = useState("");
  const [openHistory, setOpenHistory] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data }, { data: hist }, h] = await Promise.all([
      supabase.from("parts").select("*"),
      supabase
        .from("part_history")
        .select("*")
        .order("done_date", { ascending: false })
        .order("created_at", { ascending: false }),
      fetchAircraftAndHours(supabase),
    ]);
    setParts((data as Part[]) ?? []);
    setHistory((hist as PartHistory[]) ?? []);
    setHours(h.hours);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        const { data: p } = await supabase.from("profiles").select("role, name").eq("id", auth.user.id).maybeSingle();
        setIsAdmin(p?.role === "admin");
        setMyName(p?.name ?? "");
      }
      await load();
    })();
  }, [load]);

  async function add() {
    setError("");
    if (!draft.name.trim()) return setError("Bitte eine Bezeichnung angeben.");
    if (!draft.interval_value || Number(draft.interval_value) <= 0) return setError("Bitte ein Intervall grösser als 0 angeben.");
    if (draft.last_value === "") return setError("Bitte den letzten Wechsel / die letzte Kontrolle angeben.");
    setBusy(true);
    const payload = {
      name: draft.name.trim(),
      interval_type: draft.interval_type,
      interval_value: Number(draft.interval_value),
      last_value: draft.last_value,
      note: draft.note || null,
    };
    const table = createClient().from("parts");
    const { error } = editId
      ? await table.update(payload).eq("id", editId)
      : await table.insert(payload);
    setBusy(false);
    if (error) return setError(error.message);
    closeForm();
    load();
  }

  function closeForm() {
    setDraft(emptyDraft);
    setEditId(null);
    setShowForm(false);
    setError("");
  }

  function startEdit(p: Part) {
    setDraft({
      name: p.name,
      interval_type: p.interval_type,
      interval_value: String(Number(p.interval_value)),
      last_value: p.last_value,
      note: p.note ?? "",
    });
    setEditId(p.id);
    setError("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** Wartung erledigt: letzter Wechsel = aktueller Stundenstand bzw. heutiges Datum. */
  function doneValue(p: Part): string {
    return p.interval_type === "stunden" ? hours.toFixed(1) : toKey(new Date());
  }

  function askDone(id: string | null) {
    setDoneId(id);
    setDoneNote("");
  }

  async function markDone(p: Part) {
    setError("");
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("parts")
      .update({ last_value: doneValue(p) })
      .eq("id", p.id);
    if (updateError) {
      askDone(null);
      return setError(updateError.message);
    }
    const { error: historyError } = await supabase.from("part_history").insert({
      part_id: p.id,
      done_date: toKey(new Date()),
      done_hours: hours,
      note: doneNote.trim() || null,
      done_by: myName || null,
    });
    askDone(null);
    if (historyError) {
      setError(`Der Wechsel ist gespeichert, aber der Verlaufseintrag nicht: ${historyError.message}`);
    } else {
      setOpenHistory(p.id);
    }
    load();
  }

  async function removeHistory(id: string) {
    if (!confirm("Diesen Verlaufseintrag wirklich löschen? Der letzte Wechsel des Teils bleibt unverändert.")) return;
    await createClient().from("part_history").delete().eq("id", id);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Teil wirklich löschen? Der Verlauf dieses Teils wird ebenfalls gelöscht.")) return;
    await createClient().from("parts").delete().eq("id", id);
    load();
  }

  const withStatus = parts.map((p) => ({ p, s: getPartStatus(p, hours) })).sort((a, b) => a.s.percent - b.s.percent);

  return (
    <div className="card">
      <SectionTitle
        icon={Wrench}
        action={
          isAdmin && (
            <button className="btn" onClick={() => (showForm ? closeForm() : setShowForm(true))}>
              {showForm ? <X size={14} /> : <Plus size={14} />}
              {showForm ? "Abbrechen" : "Teil hinzufügen"}
            </button>
          )
        }
      >
        Teile &amp; Wartung
      </SectionTitle>

      <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 14 }}>
        Aktueller Stundenstand für die Berechnung: <strong style={{ color: "var(--navy)" }}>{hours.toFixed(1)} h</strong>
        {" "}(aus dem Flugbuch abgeleitet; Administratoren können ihn in den Einstellungen festlegen).
      </div>

      {error && !showForm && <div className="error-box" style={{ marginBottom: 12 }}>{error}</div>}

      {showForm && (
        <div className="form-block">
          <h3 style={{ fontSize: 16, margin: 0 }}>{editId ? "Teil bearbeiten" : "Neues Teil"}</h3>
          {error && <div className="error-box">{error}</div>}
          <Field label="Bezeichnung"><input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="z.B. ELT-Batterie, 50h-Kontrolle, Ölwechsel" /></Field>
          <div className="grid-auto">
            <Field label="Intervalltyp">
              <select className="input" value={draft.interval_type} onChange={(e) => setDraft({ ...draft, interval_type: e.target.value as "stunden" | "kalender", last_value: "" })}>
                <option value="stunden">Betriebsstunden</option>
                <option value="kalender">Kalenderzeit</option>
              </select>
            </Field>
            <Field label={draft.interval_type === "stunden" ? "Intervall (Stunden)" : "Intervall (Monate)"}>
              <input type="number" step="0.1" min="0" className="input" value={draft.interval_value} onChange={(e) => setDraft({ ...draft, interval_value: e.target.value })} />
            </Field>
            <Field label={draft.interval_type === "stunden" ? "Letzter Wechsel (Stundenstand)" : "Letzter Wechsel (Datum)"}>
              {draft.interval_type === "stunden" ? (
                <input type="number" step="0.1" className="input" value={draft.last_value} onChange={(e) => setDraft({ ...draft, last_value: e.target.value })} />
              ) : (
                <input type="date" className="input" value={draft.last_value} onChange={(e) => setDraft({ ...draft, last_value: e.target.value })} />
              )}
            </Field>
          </div>
          <Field label="Bemerkung"><input className="input" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /></Field>
          <button className="btn" disabled={busy} onClick={add} style={{ alignSelf: "flex-start" }}>
            <Check size={14} /> {editId ? "Änderungen speichern" : "Teil speichern"}
          </button>
        </div>
      )}

      {withStatus.length === 0 ? (
        <div className="empty">Noch keine Teile mit Laufzeit erfasst.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {withStatus.map(({ p, s }) => {
            const entries = history.filter((h) => h.part_id === p.id);
            const open = openHistory === p.id;
            return (
              <div key={p.id} className="row-item" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <Gauge percent={s.percent} status={s.status} />
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 600, fontSize: 14.5 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>
                    Fällig bei {s.dueLabel} · Intervall: {Number(p.interval_value)} {p.interval_type === "stunden" ? "h" : "Monate"}
                    {p.note ? ` · ${p.note}` : ""}
                  </div>
                  <div style={{ marginTop: 6 }}><Badge tone={s.status}>{s.remainingLabel}</Badge></div>

                  <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    {isAdmin && doneId !== p.id && (
                      <button className="btn btn-outline" onClick={() => askDone(p.id)}>
                        <Check size={13} /> Wartung erledigt
                      </button>
                    )}
                    <button className="btn btn-ghost" onClick={() => setOpenHistory(open ? null : p.id)} aria-expanded={open}>
                      {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Verlauf ({entries.length})
                    </button>
                  </div>

                  {isAdmin && doneId === p.id && (
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                      <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
                        Letzter Wechsel wird auf{" "}
                        <b style={{ color: "var(--ink)" }}>
                          {p.interval_type === "stunden" ? `${doneValue(p)} h` : fmtDate(doneValue(p))}
                        </b>{" "}
                        gesetzt und im Verlauf eingetragen.
                      </span>
                      <input
                        className="input"
                        style={{ maxWidth: 300 }}
                        value={doneNote}
                        onChange={(e) => setDoneNote(e.target.value)}
                        placeholder="Bemerkung (optional), z.B. Werkstatt, Teilenummer"
                        aria-label="Bemerkung zum Verlaufseintrag"
                      />
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-ok" onClick={() => markDone(p)}>Eintragen</button>
                        <button className="btn btn-ghost" onClick={() => askDone(null)}>Abbrechen</button>
                      </div>
                    </div>
                  )}

                  {open && (
                    <div style={{ marginTop: 10, borderTop: "1px dashed var(--border)", paddingTop: 8 }}>
                      {entries.length === 0 ? (
                        <div className="empty">Noch keine Wartung eingetragen.</div>
                      ) : (
                        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                          {entries.map((h) => (
                            <li key={h.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12.5 }}>
                              <span>
                                <span className="mono" style={{ fontWeight: 600, color: "var(--navy)" }}>{fmtDate(h.done_date)}</span>
                                {h.done_hours !== null && <> · {Number(h.done_hours).toFixed(1)} h</>}
                                {h.done_by && <> · {h.done_by}</>}
                                {h.note && <span style={{ color: "var(--ink-soft)" }}> · {h.note}</span>}
                              </span>
                              {isAdmin && (
                                <button onClick={() => removeHistory(h.id)} aria-label="Verlaufseintrag löschen" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                                  <Trash2 size={13} color="var(--red)" />
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
                {isAdmin && (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => startEdit(p)} aria-label="Bearbeiten" style={{ background: "none", border: "none", cursor: "pointer" }}>
                      <Pencil size={15} color="var(--navy)" />
                    </button>
                    <button onClick={() => remove(p.id)} aria-label="Löschen" style={{ background: "none", border: "none", cursor: "pointer" }}>
                      <Trash2 size={15} color="var(--red)" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
