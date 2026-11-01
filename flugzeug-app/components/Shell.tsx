"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Plane, CalendarDays, BookOpen, AlertTriangle, Wrench,
  LayoutDashboard, Settings, LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Aircraft, Profile } from "@/lib/types";

export default function Shell({
  aircraft,
  hours,
  profile,
  children,
}: {
  aircraft: Aircraft | null;
  hours: number;
  profile: Profile;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    { href: "/", label: "Übersicht", icon: LayoutDashboard },
    { href: "/reservation", label: "Reservierung", icon: CalendarDays },
    { href: "/flugbuch", label: "Flugbuch", icon: BookOpen },
    { href: "/maengel", label: "Mängel", icon: AlertTriangle },
    { href: "/wartung", label: "Wartung", icon: Wrench },
    ...(profile.role === "admin"
      ? [{ href: "/einstellungen", label: "Einstellungen", icon: Settings }]
      : []),
  ];

  async function logout() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <header style={{ background: "var(--navy-dark)", padding: "18px 20px 0" }}>
        <div style={{ maxWidth: 920, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ background: "var(--gold)", borderRadius: 8, padding: 8, display: "flex" }}>
                <Plane size={20} color="var(--navy-dark)" />
              </div>
              <div>
                <div className="display" style={{ fontSize: 24, fontWeight: 600, color: "#fff" }}>
                  {aircraft?.registration ?? "Flugzeug"}
                </div>
                <div className="mono" style={{ fontSize: 12, color: "#ffffffaa" }}>
                  {aircraft?.type}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ textAlign: "right" }}>
                <div className="mono" style={{ fontSize: 22, fontWeight: 600, color: "var(--gold)" }}>
                  {hours.toFixed(1)} h
                </div>
                <div style={{ fontSize: 11, color: "#ffffff88", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Aktueller Stundenstand
                </div>
              </div>
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
              const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
              const Icon = t.icon;
              return (
                <Link key={t.href} href={t.href} className={`nav-link${active ? " active" : ""}`}>
                  <Icon size={15} />
                  {t.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 920, margin: "0 auto", padding: "24px 20px 60px" }}>{children}</main>
    </div>
  );
}
