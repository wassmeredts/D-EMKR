"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plane } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Field } from "@/components/ui";

type Mode = "login" | "register" | "reset";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    const supabase = createClient();
    const origin = window.location.origin;

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/");
        router.refresh();
      } else if (mode === "register") {
        if (password.length < 8) throw new Error("Das Passwort muss mindestens 8 Zeichen haben.");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: `${origin}/auth/confirm`,
          },
        });
        if (error) throw error;
        if (data.session) {
          router.replace("/");
          router.refresh();
        } else {
          setInfo(
            "Fast geschafft: Wir haben dir eine E-Mail geschickt. Bestätige deine Adresse über den Link darin und melde dich danach an."
          );
          setMode("login");
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${origin}/auth/confirm?next=/passwort`,
        });
        if (error) throw error;
        setInfo("Falls ein Konto mit dieser Adresse existiert, ist eine E-Mail zum Zurücksetzen unterwegs.");
        setMode("login");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
      setError(
        msg === "Invalid login credentials"
          ? "E-Mail oder Passwort stimmt nicht."
          : msg === "Email not confirmed"
          ? "Bitte bestätige zuerst deine E-Mail-Adresse (Link in der Willkommens-Mail)."
          : msg
      );
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "login" ? "Anmelden" : mode === "register" ? "Konto erstellen" : "Passwort zurücksetzen";

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, justifyContent: "center" }}>
          <div style={{ background: "var(--gold)", borderRadius: 8, padding: 8, display: "flex" }}>
            <Plane size={22} color="var(--navy-dark)" />
          </div>
          <h1 style={{ fontSize: 26, margin: 0, color: "var(--navy-dark)" }}>Flugzeug-Verwaltung</h1>
        </div>

        <form onSubmit={submit} className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>{title}</h2>

          {error && <div className="error-box">{error}</div>}
          {info && <div className="info-box">{info}</div>}

          {mode === "register" && (
            <Field label="Name">
              <input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Vor- und Nachname" autoComplete="name" />
            </Field>
          )}
          <Field label="E-Mail">
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </Field>
          {mode !== "reset" && (
            <Field label="Passwort">
              <input
                className="input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder={mode === "register" ? "mindestens 8 Zeichen" : ""}
              />
            </Field>
          )}

          <button className="btn" type="submit" disabled={busy} style={{ justifyContent: "center" }}>
            {busy ? "Einen Moment…" : title}
          </button>

          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6, fontSize: 13 }}>
            {mode === "login" ? (
              <>
                <button type="button" className="btn btn-ghost" style={{ padding: "4px 0" }} onClick={() => { setMode("register"); setError(""); }}>
                  Neues Konto erstellen
                </button>
                <button type="button" className="btn btn-ghost" style={{ padding: "4px 0" }} onClick={() => { setMode("reset"); setError(""); }}>
                  Passwort vergessen?
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-ghost" style={{ padding: "4px 0" }} onClick={() => { setMode("login"); setError(""); }}>
                ← Zurück zur Anmeldung
              </button>
            )}
          </div>
        </form>

        {mode === "register" && (
          <p style={{ fontSize: 12.5, color: "var(--ink-soft)", textAlign: "center", marginTop: 12 }}>
            Neue Konten müssen vom Flugzeug-Administrator freigegeben werden, bevor Daten sichtbar sind.
          </p>
        )}
      </div>
    </main>
  );
}
