"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Pencil, Plane, Plus, Trash2, UserCheck, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAircraft } from "@/components/AircraftContext";
import type { Aircraft, Profile } from "@/lib/types";
import { Badge, Field, SectionTitle } from "@/components/ui";

type EditDraft = { id: number; registration: string; type: string; hours_override: string };

function friendly(error: { code?: string; message: string }) {
  return error.code === "23505" ? "Dieses Kennzeichen gibt es schon." : error.message;
}

export default function EinstellungenPage() {
  const { list, reload, current } = useAircraft();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [meId, setMeId] = useState("");
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const [showNew, setShowNew] = useState(false);
  const [nw, setNw] = useState({ registration: "", type: "" });
  const [edit, setEdit] = useState<EditDraft | null>(null);
  const [delId, setDelId] = useState<number | null>(null);
  const [delText, setDelText] = useState("");

  const loadUsers = useCallback(async () => {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    setMeId(auth.user?.id ?? "");
    const { data: pr } = await supabase.from("profiles").select("*").order("created_at");
    const users = (pr as Profile[]) ?? [];
    setProfiles(users);
    setAllowed(users.find((p) => p.id === auth.user?.id)?.role === "admin");
  }, []);

  useEffect(() => {
    (async () => {
      await loadUsers();
    })();
  }, [loadUsers]);

  /* ---------- Flugzeuge ---------- */
  async function addAircraft() {
    setMsg(""); setError("");
    const registration = nw.registration.trim().toUpperCase();
    if (!registration) return setError("Bitte ein Kennzeichen angeben.");
    const { error } = await createClient().from("aircraft").insert({ registration, type: nw.type.trim() });
    if (error) return setError(friendly(error));
    setNw({ registration: "", type: "" });
    setShowNew(false);
    setMsg(`${registration} wurde angelegt. Du kannst es oben im Kopfbereich auswählen.`);
    await reload();
  }

  function startEdit(a: Aircraft) {
    setMsg(""); setError("");
    setDelId(null);
    setEdit({ id: a.id, registration: a.registration, type: a.type, hours_override: a.hours_override === null ? "" : String(a.hours_override) });
  }

  async function saveAircraft() {
    if (!edit) return;
    setMsg(""); setError("");
    const registration = edit.registration.trim().toUpperCase();
    if (!registration) return setError("Bitte ein Kennzeichen angeben.");
    const { error } = await createClient()
      .from("aircraft")
      .update({
        registration,
        type: edit.type.trim(),
        hours_override: edit.hours_override === "" ? null : Number(edit.hours_override),
      })
      .eq("id", edit.id);
    if (error) return setError(friendly(error));
    setEdit(null);
    setMsg("Gespeichert.");
    await reload();
  }

  async function deleteAircraft(a: Aircraft) {
    setMsg(""); setError("");
    const { error } = await createClient().from("aircraft").delete().eq("id", a.id);
    if (error) return setError(error.message);
    setDelId(null);
    setDelText("");
    setMsg(`${a.registration} und alle zugehörigen Daten wurden gelöscht.`);
    await reload();
  }

  /* ---------- Benutzer ---------- */
  async function setApproved(id: string, approved: boolean) {
    await createClient().from("profiles").update({ approved }).eq("id", id);
    loadUsers();
  }
  async function setRole(id: string, role: "admin" | "pilot") {
    await createClient().from("profiles").update({ role }).eq("id", id);
    loadUsers();
  }
  async function removeProfile(id: string) {
    if (!confirm("Dieses Profil wirklich entfernen? Die Person kann sich danach nicht mehr einloggen und sieht keine Daten.")) return;
    await createClient().from("profiles").delete().eq("id", id);
    loadUsers();
  }

  if (allowed === null) return <div className="empty">Lade…</div>;
  if (!allowed) return <div className="card">Dieser Bereich ist nur für Administratoren.</div>;

  const pending = profiles.filter((p) => !p.approved);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="card">
        <SectionTitle
          icon={Plane}
          action={
            <button className="btn" onClick={() => { setShowNew((s) => !s); setError(""); setMsg(""); }}>
              {showNew ? <X size={14} /> : <Plus size={14} />}
              {showNew ? "Abbrechen" : "Flugzeug anlegen"}
            </button>
          }
        >
          Flugzeuge
        </SectionTitle>

        {error && <div className="error-box" style={{ marginBottom: 10 }}>{error}</div>}
        {msg && <div className="info-box" style={{ marginBottom: 10 }}>{msg}</div>}

        {showNew && (
          <div className="form-block">
            <h3 style={{ fontSize: 16, margin: 0 }}>Neues Flugzeug</h3>
            <div className="grid-auto">
              <Field label="Kennzeichen">
                <input className="input" value={nw.registration} onChange={(e) => setNw({ ...nw, registration: e.target.value })} placeholder="z.B. HB-ABC" />
              </Field>
              <Field label="Typ">
                <input className="input" value={nw.type} onChange={(e) => setNw({ ...nw, type: e.target.value })} placeholder="z.B. Cessna 172" />
              </Field>
            </div>
            <button className="btn" onClick={addAircraft} style={{ alignSelf: "flex-start" }}>
              <Check size={14} /> Flugzeug speichern
            </button>
          </div>
        )}

        {list.length === 0 ? (
          <div className="empty">Noch kein Flugzeug angelegt. Lege mit «Flugzeug anlegen» das erste an.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {list.map((a) => (
              <div key={a.id} className="row-item" style={{ padding: "12px 14px" }}>
                {edit?.id === a.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div className="grid-auto">
                      <Field label="Kennzeichen"><input className="input" value={edit.registration} onChange={(e) => setEdit({ ...edit, registration: e.target.value })} /></Field>
                      <Field label="Typ"><input className="input" value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value })} /></Field>
                      <Field label="Stundenstand manuell">
                        <input type="number" step="0.1" className="input" value={edit.hours_override} onChange={(e) => setEdit({ ...edit, hours_override: e.target.value })} placeholder="leer = aus Flugbuch" />
                      </Field>
                    </div>
                    <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: 0 }}>
                      Ist kein Stundenstand gesetzt, gilt der höchste Zählerstand aus dem Flugbuch dieses Flugzeugs.
                    </p>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn" onClick={saveAircraft}><Check size={14} /> Speichern</button>
                      <button className="btn btn-ghost" onClick={() => { setEdit(null); setError(""); }}>Abbrechen</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                          <span className="display" style={{ fontSize: 18, fontWeight: 600 }}>{a.registration}</span>
                          {current?.id === a.id && <Badge tone="ink">Gewählt</Badge>}
                        </div>
                        <div className="mono" style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                          {a.type || "ohne Typ"}
                          {a.hours_override !== null ? ` · Stundenstand manuell: ${Number(a.hours_override).toFixed(1)} h` : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-outline" onClick={() => startEdit(a)}><Pencil size={13} /> Bearbeiten</button>
                        <button className="btn btn-danger" onClick={() => { setDelId(delId === a.id ? null : a.id); setDelText(""); setEdit(null); }} aria-label={`${a.registration} löschen`}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {delId === a.id && (
                      <div className="error-box" style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                        <span>
                          Achtung: Beim Löschen von <b>{a.registration}</b> werden auch alle Reservierungen, Flüge,
                          Mängel, Teile und der Wartungsverlauf dieses Flugzeugs unwiderruflich gelöscht.
                          Gib zur Bestätigung das Kennzeichen ein.
                        </span>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <input
                            className="input"
                            style={{ maxWidth: 200 }}
                            value={delText}
                            onChange={(e) => setDelText(e.target.value)}
                            placeholder={a.registration}
                            aria-label="Kennzeichen zur Bestätigung"
                          />
                          <button
                            className="btn"
                            style={{ background: "var(--red)" }}
                            disabled={delText.trim().toUpperCase() !== a.registration.toUpperCase()}
                            onClick={() => deleteAircraft(a)}
                          >
                            Endgültig löschen
                          </button>
                          <button className="btn btn-ghost" onClick={() => { setDelId(null); setDelText(""); }}>Abbrechen</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <SectionTitle icon={UserCheck}>Benutzer {pending.length > 0 && <Badge tone="warn">{pending.length} warten auf Freigabe</Badge>}</SectionTitle>
        <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 0 }}>
          Freigegebene Benutzer sehen und nutzen alle Flugzeuge.
        </p>
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
