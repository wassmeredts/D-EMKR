"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field } from "@/components/ui";

export default function NewPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Das Passwort muss mindestens 8 Zeichen haben.");
      return;
    }
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <form onSubmit={submit} className="card" style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Neues Passwort festlegen</h2>
        {error && <div className="error-box">{error}</div>}
        <Field label="Neues Passwort">
          <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="mindestens 8 Zeichen" />
        </Field>
        <button className="btn" type="submit" disabled={busy} style={{ justifyContent: "center" }}>
          {busy ? "Einen Moment…" : "Passwort speichern"}
        </button>
      </form>
    </main>
  );
}
