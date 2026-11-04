import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AircraftProvider } from "@/components/AircraftContext";
import Shell from "@/components/Shell";
import type { Profile } from "@/lib/types";

async function AuthedShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // Noch nicht freigegeben: keine Daten anzeigen
  if (!profile || !profile.approved) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div className="card" style={{ maxWidth: 440, textAlign: "center" }}>
          <h2 style={{ fontSize: 22, marginTop: 0 }}>Warten auf Freigabe</h2>
          <p style={{ color: "var(--ink-soft)", lineHeight: 1.6 }}>
            Dein Konto ({user.email}) ist angelegt. Ein Administrator muss es
            noch freischalten, bevor du Reservierungen, Flugbuch und Mängel
            sehen kannst. Schau später nochmals vorbei.
          </p>
          <form action="/auth/signout" method="post">
            <button className="btn btn-outline" type="submit">Abmelden</button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <AircraftProvider>
      <Shell profile={profile as Profile}>{children}</Shell>
    </AircraftProvider>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-soft)" }}>
          Lade…
        </div>
      }
    >
      <AuthedShell>{children}</AuthedShell>
    </Suspense>
  );
}
