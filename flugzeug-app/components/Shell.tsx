"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Plane, CalendarDays, BookOpen, AlertTriangle, Wrench,
  LayoutDashboard, Settings, LogOut, Layers,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAircraft } from "@/components/AircraftContext";
import type { Profile } from "@/lib/types";

export default function Shell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { list, current, hours, ready, select, href } = useAircraft();
  const isAdmin = profile.role === "admin";

  const tabs = [
    ...(list.length > 1 ? [{ path: "/flotte", label: "Alle Flugzeuge", icon: Layers }] : []),
    { path: "/", label: "Übersicht", icon: LayoutDashboard },
    { path: "/reservation", label: "Reservierung", icon: CalendarDays },
    { path: "/flugbuch", label: "Flugbuch", icon: BookOpen },
    { path: "/maengel", label: "Mängel", icon: AlertTriangle },
    { path: "/wartung", label: "Wartung", icon: Wrench },
    ...(isAdmin ? [{ path: "/einstellungen", label: "Einstellungen", icon: Settings }] : []),
  ];

  async function logout() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  // Ohne Flugzeug gibt es nichts zu zeigen, ausser den Einstellungen (dort legt man es an)
  const needsAircraft = pathname !== "/einstellungen";
  let body: React.ReactNode = children;
  if (!ready) {
    body = <div className="empty">Lade Daten…</div>;
  } else if (needsAircraft && !current) {
    body = (
      <div className="card" style={{ maxWidth: 520 }}>
        <h2 style={{ fontSize: 20, marginTop: 0 }}>Noch kein Flugzeug angelegt</h2>
        {isAdmin ? (
          <>
            <p style={{ color: "var(--ink-soft)", lineHeight: 1.6 }}>
              Lege zuerst dein erstes Flugzeug an. Danach kannst du reservieren, Flüge erfassen, Mängel melden und Wartung verwalten.
            </p>
            <Link href="/einstellungen" className="btn">Flugzeug anlegen</Link>
          </>
        ) : (
          <p style={{ color: "var(--ink-soft)", lineHeight: 1.6 }}>
            Ein Administrator muss zuerst ein Flugzeug anlegen. Schau später nochmals vorbei.
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <header style={{ background: "var(--navy-dark)", padding: "18px 20px 0" }}>
        <div style={{ maxWidth: 920, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <div style={{ background: "var(--gold)", borderRadius: 8, padding: 8, display: "flex" }}>
                <Plane size={20} color="var(--navy-dark)" />
              </div>
              <div style={{ minWidth: 0 }}>
                {list.length > 1 && current ? (
                  <select
                    className="ac-select"
                    aria-label="Flugzeug wählen"
                    value={current.id}
                    onChange={(e) => select(Number(e.target.value))}
                  >
                    {list.map((a) => (
                      <option key={a.id} value={a.id}>{a.registration}</option>
                    ))}
                  </select>
                ) : (
                  <div className="display" style={{ fontSize: 24, fontWeight: 600, color: "#fff", lineHeight: 1.2 }}>
                    {current?.registration ?? "Flugzeug-Verwaltung"}
                  </div>
                )}
                <div className="mono" style={{ fontSize: 12, color: "#ffffffaa" }}>
                  {current?.type}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              {current && (
                <div style={{ textAlign: "right" }}>
                  <div className="mono" style={{ fontSize: 22, fontWeight: 600, color: "var(--gold)" }}>
                    {hours.toFixed(1)} h
                  </div>
                  <div style={{ fontSize: 11, color: "#ffffff88", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Aktueller Stundenstand
                  </div>
                </div>
              )}
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{profile.name || profile.email}</div>
                <button
                  onClick={logout}
                  style={{ background: "none", border: "none", color: "#ffffffaa", cursor: "pointer", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4, padding: 0 }}
                >
                  <LogOut size={12} /> Abmelden
                </button>
              </div>
            </div>
          </div>

          <nav style={{ display: "flex", gap: 2, marginTop: 18, overflowX: "auto" }}>
            {tabs.map((t) => {
              const active = t.path === "/" ? pathname === "/" : pathname.startsWith(t.path);
              const Icon = t.icon;
              return (
                <Link key={t.path} href={href(t.path)} className={`nav-link${active ? " active" : ""}`}>
                  <Icon size={15} />
                  {t.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 920, margin: "0 auto", padding: "24px 20px 60px" }}>{body}</main>
    </div>
  );
}
