import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function Badge({
  children,
  tone = "ink",
}: {
  children: ReactNode;
  tone?: "ok" | "warn" | "overdue" | "ink";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function SectionTitle({
  icon: Icon,
  children,
  action,
}: {
  icon: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 14,
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon size={18} color="var(--navy)" />
        <h2 style={{ fontSize: 19, fontWeight: 600, margin: 0 }}>{children}</h2>
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  tone = "ink",
  href,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "overdue" | "ink";
  href?: string;
}) {
  const color = {
    ok: "var(--green)",
    warn: "var(--gold)",
    overdue: "var(--red)",
    ink: "var(--navy)",
  }[tone];
  const inner = (
    <div
      className="card"
      style={{ borderLeft: `4px solid ${color}`, padding: "14px 16px" }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--ink-soft)",
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div className="mono" style={{ fontSize: 18, fontWeight: 600 }}>
        {value}
      </div>
    </div>
  );
  return href ? (
    <a href={href} style={{ textDecoration: "none", color: "inherit" }}>
      {inner}
    </a>
  ) : (
    inner
  );
}

/* ---------- Instrumenten-Anzeige für Wartungsteile ---------- */
function pointOnGauge(cx: number, cy: number, r: number, percent: number) {
  const angle = -120 + (Math.max(0, Math.min(100, percent)) / 100) * 240;
  const rad = (angle * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}
function arcPath(cx: number, cy: number, r: number, p1: number, p2: number) {
  const start = pointOnGauge(cx, cy, r, p1);
  const end = pointOnGauge(cx, cy, r, p2);
  const largeArc = Math.abs(((p2 - p1) / 100) * 240) > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export function Gauge({
  percent,
  status,
}: {
  percent: number;
  status: "ok" | "warn" | "overdue";
}) {
  const cx = 90, cy = 88, r = 62, needleLen = 50;
  const needle = pointOnGauge(cx, cy, needleLen, percent);
  const color =
    status === "overdue"
      ? "var(--red)"
      : status === "warn"
      ? "var(--gold)"
      : "var(--green)";
  return (
    <svg
      viewBox="0 0 180 130"
      style={{ width: 110, height: 82, flexShrink: 0 }}
      role="img"
      aria-label={`Restlaufzeit ${Math.max(0, Math.round(percent))} Prozent`}
    >
      <path d={arcPath(cx, cy, r, 0, 15)} stroke="var(--red)" strokeWidth="11" fill="none" opacity="0.85" />
      <path d={arcPath(cx, cy, r, 15, 35)} stroke="var(--gold)" strokeWidth="11" fill="none" opacity="0.85" />
      <path d={arcPath(cx, cy, r, 35, 100)} stroke="var(--green)" strokeWidth="11" fill="none" opacity="0.75" />
      {[0, 25, 50, 75, 100].map((t) => {
        const p1 = pointOnGauge(cx, cy, r + 8, t);
        const p2 = pointOnGauge(cx, cy, r + 2, t);
        return (
          <line key={t} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="var(--ink)" strokeWidth="1.5" opacity="0.5" />
        );
      })}
      <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5" fill="var(--ink)" />
      <circle cx={cx} cy={cy} r="2" fill={color} />
    </svg>
  );
}
