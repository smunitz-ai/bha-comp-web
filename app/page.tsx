"use client";

import React, { useMemo, useState } from "react";

type RowsSection = { kind: "rows"; title: string; rows: { label: string; value: string }[] };
type TableSection = { kind: "table"; title: string; headers: string[]; rows: string[][] };
type NoteSection = { kind: "note"; title: string; value: string };
type Section = RowsSection | TableSection | NoteSection;

type ApiResponse = { ok: boolean; sections?: Section[]; error?: string };

const OPTIONS = {
  tiers: ["1", "2", "3", "4", "5"],
  scenarios: ["Two Spouses", "One Spouse"],
  spouseARoles: ["Primary Breadwinner", "Non-Primary Breadwinner"],
  genders: ["Man", "Woman"],
  yesNo: ["Yes", "No"],
  perfLevels: ["Level 1", "Level 2", "Level 3", "Level 4"],
  programYears: [
    "Year 1",
    "Year 2–5",
    "Year 6",
    "Year 7–11",
    "Year 12",
    "Year 13–18",
    "Year 19",
    "Year 20–26",
    "Year 27",
    "Year 28+",
  ],
  ftes: ["0.5", "0.6", "0.75", "1"],
};

// -------------------- tiny icon set (inline SVG, no deps) --------------------
function Icon({
  name,
  size = 16,
}: {
  name: "sparkle" | "calc" | "users" | "person" | "grid" | "money" | "chart" | "wrench" | "chevron";
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg" as const,
  };

  if (name === "sparkle")
    return (
      <svg {...common}>
        <path
          d="M12 2l1.2 4.2L17.4 8 13.2 9.2 12 13.4 10.8 9.2 6.6 8l4.2-1.8L12 2z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M19 12l.8 2.7L22 16l-2.2.3L19 19l-.8-2.7L16 16l2.2-.3L19 12z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );

  if (name === "calc")
    return (
      <svg {...common}>
        <path
          d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path d="M8 6h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8 10h2M12 10h2M16 10h0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8 14h2M12 14h2M16 14h0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8 18h2M12 18h2M16 18h0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );

  if (name === "users")
    return (
      <svg {...common}>
        <path d="M16 11a4 4 0 1 0-8 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M4 21a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path
          d="M20 21a6 6 0 0 0-6-6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.45"
        />
      </svg>
    );

  if (name === "person")
    return (
      <svg {...common}>
        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4 21a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );

  if (name === "grid")
    return (
      <svg {...common}>
        <path
          d="M4 4h7v7H4V4zM13 4h7v7h-7V4zM4 13h7v7H4v-7zM13 13h7v7h-7v-7z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    );

  if (name === "money")
    return (
      <svg {...common}>
        <path d="M4 7h16v10H4V7z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7 10h0M17 14h0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );

  if (name === "chart")
    return (
      <svg {...common}>
        <path d="M4 20V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M4 20h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M7 16v-5M12 16v-9M17 16v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );

  if (name === "wrench")
    return (
      <svg {...common}>
        <path
          d="M14.5 6.5a4 4 0 0 0-5 5L3 18l3 3 6.5-6.5a4 4 0 0 0 5-5l-2.2 2.2-2.8-2.8L14.5 6.5z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );

  return (
    <svg {...common}>
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// -------------------- Styles --------------------
const pageBg: React.CSSProperties = {
  minHeight: "100vh",
  background:
    "radial-gradient(1200px 500px at 10% 0%, rgba(99,102,241,0.18), transparent 60%)," +
    "radial-gradient(900px 450px at 85% 10%, rgba(16,185,129,0.16), transparent 55%)," +
    "linear-gradient(180deg, #f8fafc 0%, #eef2ff 55%, #f8fafc 100%)",
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
};

const surface: React.CSSProperties = {
  background: "rgba(255,255,255,0.9)",
  border: "1px solid rgba(226,232,240,0.9)",
  borderRadius: 18,
  boxShadow: "0 16px 40px rgba(15,23,42,0.08)",
  backdropFilter: "blur(6px)",
};

const control: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(226,232,240,1)",
  background: "white",
  fontSize: 14,
  outline: "none",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 12,
  letterSpacing: ".12em",
  color: "#475569",
  fontWeight: 950,
};

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 11,
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(226,232,240,1)",
        background: "rgba(248,250,252,0.9)",
        color: "#0f172a",
        fontWeight: 900,
      }}
    >
      {children}
    </span>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 11,
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(99,102,241,0.25)",
        background: "rgba(99,102,241,0.10)",
        color: "#1e293b",
        fontWeight: 900,
      }}
    >
      {children}
    </span>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6, fontWeight: 700 }}>{label}</div>
      {children}
      {hint ? <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>{hint}</div> : null}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid rgba(226,232,240,1)",
        borderRadius: 14,
        padding: 12,
        background: "rgba(248,250,252,0.75)",
      }}
    >
      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 900, letterSpacing: ".10em" }}>
        {label.toUpperCase()}
      </div>
      <div style={{ marginTop: 6, fontSize: 16, fontWeight: 1000, color: "#0f172a" }}>{value || "—"}</div>
    </div>
  );
}

function categoryForTitle(title: string) {
  const t = title.toLowerCase();
  if (t.includes("compensation"))
    return {
      key: "comp",
      label: "Compensation",
      icon: "money" as const,
      tint: "rgba(99,102,241,0.10)",
      border: "rgba(99,102,241,0.22)",
    };
  if (t === "totals" || t.includes("grand total") || t.includes("total"))
    return {
      key: "totals",
      label: "Totals",
      icon: "chart" as const,
      tint: "rgba(16,185,129,0.10)",
      border: "rgba(16,185,129,0.22)",
    };
  if (t.includes("additional"))
    return {
      key: "addl",
      label: "Additional",
      icon: "calc" as const,
      tint: "rgba(245,158,11,0.10)",
      border: "rgba(245,158,11,0.22)",
    };
  if (t.includes("other"))
    return {
      key: "other",
      label: "Other",
      icon: "grid" as const,
      tint: "rgba(14,165,233,0.10)",
      border: "rgba(14,165,233,0.22)",
    };
  if (t.includes("children"))
    return {
      key: "kids",
      label: "Children",
      icon: "users" as const,
      tint: "rgba(236,72,153,0.10)",
      border: "rgba(236,72,153,0.22)",
    };
  return {
    key: "misc",
    label: "Results",
    icon: "sparkle" as const,
    tint: "rgba(148,163,184,0.12)",
    border: "rgba(148,163,184,0.24)",
  };
}

// ------------- 3-color emphasis for "Additional Calculations" key lines -------------
function accentForAdditionalCalculationsRow(sectionTitle: string, rowLabel: string) {
  const st = sectionTitle.toLowerCase();
  if (!st.includes("additional")) return null;

  const l = rowLabel.toLowerCase();

  // sky
  if (l.includes("cash benefits"))
    return { color: "#0284c7", bg: "rgba(2,132,199,0.08)", border: "rgba(2,132,199,0.22)" };

  // emerald
  if (l.includes("non-cash") || l.includes("tax advantage"))
    return { color: "#059669", bg: "rgba(5,150,105,0.08)", border: "rgba(5,150,105,0.22)" };

  // violet
  if (l.includes("after-tax disposable"))
    return { color: "#7c3aed", bg: "rgba(124,58,237,0.08)", border: "rgba(124,58,237,0.22)" };

  return null;
}

function RowsCard({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  const cat = categoryForTitle(title);

  return (
    <div
      style={{
        ...surface,
        padding: 14,
        border: `1px solid ${cat.border}`,
        background: `linear-gradient(180deg, ${cat.tint}, rgba(255,255,255,0.92))`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
              background: cat.tint,
              border: `1px solid ${cat.border}`,
              color: "#0f172a",
            }}
          >
            <Icon name={cat.icon} />
          </div>
          <div>
            <div style={{ ...sectionTitle }}>{cat.label.toUpperCase()}</div>
            <div style={{ fontSize: 13, fontWeight: 1000, color: "#0f172a", marginTop: 2 }}>{title}</div>
          </div>
        </div>
        <Pill>{rows.length} items</Pill>
      </div>

      <div style={{ border: "1px solid rgba(226,232,240,1)", borderRadius: 14, overflow: "hidden" }}>
        {rows.map((r, idx) => {
          const acc = accentForAdditionalCalculationsRow(title, r.label);
          const isAccented = Boolean(acc);

          return (
            <div
              key={r.label}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 12,
                padding: "11px 12px",
                background: isAccented
                  ? acc!.bg
                  : idx % 2
                    ? "rgba(255,255,255,0.92)"
                    : "rgba(248,250,252,0.82)",
                borderTop: idx === 0 ? "none" : "1px solid rgba(226,232,240,0.7)",
                alignItems: "center",
                boxShadow: isAccented ? `inset 3px 0 0 ${acc!.color}` : "none",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: isAccented ? acc!.color : "#0f172a",
                  fontWeight: isAccented ? 950 : 700, // label bold on accented lines
                }}
              >
                {r.label}
              </div>

              <div
                style={{
                  fontSize: 13,
                  fontWeight: 950, // values bold always
                  whiteSpace: "nowrap",
                  color: isAccented ? acc!.color : "#0f172a",
                }}
              >
                {r.value || "—"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TableCard({ title, headers, rows }: { title: string; headers: string[]; rows: string[][] }) {
  const cat = categoryForTitle(title);

  return (
    <div
      style={{
        ...surface,
        padding: 14,
        border: `1px solid ${cat.border}`,
        background: `linear-gradient(180deg, ${cat.tint}, rgba(255,255,255,0.92))`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
              background: cat.tint,
              border: `1px solid ${cat.border}`,
              color: "#0f172a",
            }}
          >
            <Icon name={cat.icon} />
          </div>
          <div>
            <div style={{ ...sectionTitle }}>{cat.label.toUpperCase()}</div>
            <div style={{ fontSize: 13, fontWeight: 1000, color: "#0f172a", marginTop: 2 }}>{title}</div>
          </div>
        </div>
        <Pill>{rows.length} rows</Pill>
      </div>

      <div style={{ overflowX: "auto", border: "1px solid rgba(226,232,240,1)", borderRadius: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "rgba(248,250,252,0.9)" }}>
              {headers.map((h, i) => (
                <th
                  key={i}
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    borderBottom: "1px solid rgba(226,232,240,1)",
                    color: "#0f172a",
                    fontWeight: 950,
                    whiteSpace: "nowrap",
                  }}
                >
                  {h || "—"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri} style={{ background: ri % 2 ? "rgba(255,255,255,0.92)" : "rgba(248,250,252,0.82)" }}>
                {headers.map((_, ci) => (
                  <td
                    key={ci}
                    style={{
                      padding: "10px 12px",
                      borderBottom: "1px solid rgba(226,232,240,0.7)",
                      whiteSpace: "nowrap",
                      color: "#0f172a",
                    }}
                  >
                    {r?.[ci] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NoteCard({ title, value }: { title: string; value: string }) {
  const cat = categoryForTitle(title);

  return (
    <div
      style={{
        ...surface,
        padding: 14,
        border: `1px solid ${cat.border}`,
        background: `linear-gradient(180deg, ${cat.tint}, rgba(255,255,255,0.92))`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
              background: cat.tint,
              border: `1px solid ${cat.border}`,
              color: "#0f172a",
            }}
          >
            <Icon name={cat.icon} />
          </div>
          <div>
            <div style={{ ...sectionTitle }}>{cat.label.toUpperCase()}</div>
            <div style={{ fontSize: 13, fontWeight: 1000, color: "#0f172a", marginTop: 2 }}>{title}</div>
          </div>
        </div>
      </div>

      <div
        style={{
          border: "1px solid rgba(226,232,240,1)",
          borderRadius: 14,
          padding: 12,
          background: "rgba(248,250,252,0.82)",
          fontSize: 13,
          color: "#0f172a",
          whiteSpace: "pre-wrap",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Collapsible({
  title,
  icon,
  right,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: "users" | "person" | "calc" | "sparkle";
  right?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ ...surface, padding: 14 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          border: 0,
          background: "transparent",
          padding: 0,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
              background: "rgba(99,102,241,0.10)",
              border: "1px solid rgba(99,102,241,0.22)",
              color: "#0f172a",
            }}
          >
            <Icon name={icon === "sparkle" ? "sparkle" : icon === "calc" ? "calc" : icon === "users" ? "users" : "person"} />
          </div>
          <div>
            <div style={{ ...sectionTitle }}>INPUT SECTION</div>
            <div style={{ fontSize: 14, fontWeight: 1000, color: "#0f172a", marginTop: 2 }}>{title}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {right}
          <div style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform .15s ease", color: "#334155" }}>
            <Icon name="chevron" />
          </div>
        </div>
      </button>

      {open && <div style={{ marginTop: 14 }}>{children}</div>}
    </div>
  );
}

function pickValue(sections: Section[] | null, label: string) {
  if (!sections) return "";
  for (const sec of sections) {
    if (sec.kind !== "rows") continue;
    for (const r of sec.rows) {
      if (r.label.trim().toLowerCase() === label.trim().toLowerCase()) return r.value;
    }
  }
  return "";
}

export default function Page() {
  const [form, setForm] = useState({
    tier: "2",
    scenario: "Two Spouses",

    spouseARole: "Primary Breadwinner",
    spouseAGender: "Man",
    spouseAFTE: "1",
    spouseACheder: "Yes",
    spouseAPDO: "6",

    spouseBGender: "Woman",
    spouseBFTE: "0.6",
    spouseBCheder: "Yes",
    spouseBPDO: "0",

    programYear: "Year 1",
    perfA: "Level 3",
    perfB: "Level 3",

    kidsP8: "4",
    kidsCheder: "2",
    girlsBHH: "1",
  });

  const hideSpouseB = useMemo(() => form.scenario === "One Spouse", [form.scenario]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [sections, setSections] = useState<Section[] | null>(null);
  const [showHelpers, setShowHelpers] = useState(false);

  async function run() {
    setErr("");
    setLoading(true);

    try {
      const payload: any = {
        tier: form.tier,
        scenario: form.scenario,

        spouseARole: form.spouseARole,
        spouseAGender: form.spouseAGender,
        spouseAFTE: form.spouseAFTE,
        spouseACheder: form.spouseACheder,
        spouseAPDO: form.spouseAPDO,

        ...(hideSpouseB
          ? {}
          : {
              spouseBGender: form.spouseBGender,
              spouseBFTE: form.spouseBFTE,
              spouseBCheder: form.spouseBCheder,
              spouseBPDO: form.spouseBPDO,
              perfB: form.perfB,
            }),

        programYear: form.programYear,
        kidsP8: form.kidsP8,
        kidsCheder: form.kidsCheder,
        girlsBHH: form.girlsBHH,
        perfA: form.perfA,
      };

      const res = await fetch("/api/calc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as ApiResponse;
      if (!res.ok || !data.ok) throw new Error(data.error || "Calculation failed");

      setSections(data.sections || []);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  const filteredSections = useMemo(() => {
    if (!sections) return null;
    if (showHelpers) return sections;
    return sections.filter(
      (s) => !((s.kind === "table" && s.title === "Helper Table") || (s.kind === "note" && s.title === "Helper (U1)"))
    );
  }, [sections, showHelpers]);

  return (
    <main style={pageBg}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: 24 }}>
        {/* Header */}
        <div
          style={{
            ...surface,
            padding: 18,
            borderRadius: 22,
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(16,185,129,0.12))," +
              "rgba(255,255,255,0.85)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 1000, color: "#0f172a" }}>
                  Shluchim Compensation Calculator
                </h1>
                <Badge>Sheet-powered</Badge>
              </div>
              <div style={{ color: "#475569", fontSize: 13, marginTop: 6 }}>Inputs → Google Sheet → Outputs (pretty + consistent)</div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => setShowHelpers((v) => !v)}
                style={{
                  border: "1px solid rgba(226,232,240,1)",
                  background: "rgba(255,255,255,0.85)",
                  padding: "10px 12px",
                  borderRadius: 14,
                  fontWeight: 900,
                  color: "#0f172a",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Icon name="wrench" />
                {showHelpers ? "Hide helpers" : "Show helpers"}
              </button>

              <button
                onClick={run}
                disabled={loading}
                style={{
                  border: 0,
                  padding: "11px 16px",
                  borderRadius: 14,
                  background: "linear-gradient(135deg,#0f172a,#1e293b)",
                  color: "white",
                  fontWeight: 950,
                  cursor: "pointer",
                  opacity: loading ? 0.65 : 1,
                  boxShadow: "0 14px 28px rgba(15,23,42,0.22)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Icon name="calc" />
                {loading ? "Running..." : "Run calculation"}
              </button>
            </div>
          </div>
        </div>

        {/* Inputs */}
        <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
          {/* Top input controls */}
          <div style={{ ...surface, padding: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12 }}>
              <div style={{ gridColumn: "span 3" }}>
                <Field label="Tier (1–5)">
                  <select style={control} value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>
                    {OPTIONS.tiers.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div style={{ gridColumn: "span 5" }}>
                <Field label="Spouse Scenario">
                  <select style={control} value={form.scenario} onChange={(e) => setForm({ ...form, scenario: e.target.value })}>
                    {OPTIONS.scenarios.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <Field label="Program Year">
                  <select
                    style={control}
                    value={form.programYear}
                    onChange={(e) => setForm({ ...form, programYear: e.target.value })}
                  >
                    {OPTIONS.programYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          </div>

          {/* Spouse A */}
          <Collapsible title="Spouse A" icon="person" defaultOpen={true} right={<Pill>{form.spouseAGender}, FTE {form.spouseAFTE}</Pill>}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12 }}>
              <div style={{ gridColumn: "span 4" }}>
                <Field label="Role">
                  <select
                    style={control}
                    value={form.spouseARole}
                    onChange={(e) => setForm({ ...form, spouseARole: e.target.value })}
                  >
                    {OPTIONS.spouseARoles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div style={{ gridColumn: "span 2" }}>
                <Field label="Gender">
                  <select
                    style={control}
                    value={form.spouseAGender}
                    onChange={(e) => setForm({ ...form, spouseAGender: e.target.value })}
                  >
                    {OPTIONS.genders.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div style={{ gridColumn: "span 2" }}>
                <Field label="FTE">
                  <select
                    style={control}
                    value={form.spouseAFTE}
                    onChange={(e) => setForm({ ...form, spouseAFTE: e.target.value })}
                  >
                    {OPTIONS.ftes.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div style={{ gridColumn: "span 2" }}>
                <Field label="Cheder Participation">
                  <select
                    style={control}
                    value={form.spouseACheder}
                    onChange={(e) => setForm({ ...form, spouseACheder: e.target.value })}
                  >
                    {OPTIONS.yesNo.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div style={{ gridColumn: "span 2" }}>
                <Field label="Unused PDO Days (0–12)">
                  <input style={control} value={form.spouseAPDO} onChange={(e) => setForm({ ...form, spouseAPDO: e.target.value })} />
                </Field>
              </div>
            </div>
          </Collapsible>

          {/* Spouse B */}
          {!hideSpouseB && (
            <Collapsible title="Spouse B" icon="person" defaultOpen={true} right={<Pill>{form.spouseBGender}, FTE {form.spouseBFTE}</Pill>}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12 }}>
                <div style={{ gridColumn: "span 2" }}>
                  <Field label="Gender">
                    <select
                      style={control}
                      value={form.spouseBGender}
                      onChange={(e) => setForm({ ...form, spouseBGender: e.target.value })}
                    >
                      {OPTIONS.genders.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <Field label="FTE">
                    <select style={control} value={form.spouseBFTE} onChange={(e) => setForm({ ...form, spouseBFTE: e.target.value })}>
                      {OPTIONS.ftes.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div style={{ gridColumn: "span 3" }}>
                  <Field label="Cheder Participation">
                    <select
                      style={control}
                      value={form.spouseBCheder}
                      onChange={(e) => setForm({ ...form, spouseBCheder: e.target.value })}
                    >
                      {OPTIONS.yesNo.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div style={{ gridColumn: "span 3" }}>
                  <Field label="Unused PDO Days (0–12)">
                    <input style={control} value={form.spouseBPDO} onChange={(e) => setForm({ ...form, spouseBPDO: e.target.value })} />
                  </Field>
                </div>
              </div>
            </Collapsible>
          )}

          {/* Family / Performance */}
          <Collapsible title="Family / Performance" icon="users" defaultOpen={true} right={<Pill>Kids + Reviews</Pill>}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12 }}>
              <div style={{ gridColumn: "span 4" }}>
                <Field label="Preschool through 8th Grade">
                  <input style={control} value={form.kidsP8} onChange={(e) => setForm({ ...form, kidsP8: e.target.value })} />
                </Field>
              </div>
              <div style={{ gridColumn: "span 4" }}>
                <Field label="Kids in Cheder">
                  <input style={control} value={form.kidsCheder} onChange={(e) => setForm({ ...form, kidsCheder: e.target.value })} />
                </Field>
              </div>
              <div style={{ gridColumn: "span 4" }}>
                <Field label="Girls in Bader Hillel High">
                  <input style={control} value={form.girlsBHH} onChange={(e) => setForm({ ...form, girlsBHH: e.target.value })} />
                </Field>
              </div>

              <div style={{ gridColumn: "span 3" }}>
                <Field label="Performance – Spouse A">
                  <select style={control} value={form.perfA} onChange={(e) => setForm({ ...form, perfA: e.target.value })}>
                    {OPTIONS.perfLevels.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {!hideSpouseB && (
                <div style={{ gridColumn: "span 3" }}>
                  <Field label="Performance – Spouse B">
                    <select style={control} value={form.perfB} onChange={(e) => setForm({ ...form, perfB: e.target.value })}>
                      {OPTIONS.perfLevels.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}
            </div>
          </Collapsible>

          {/* Run button */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={run}
              disabled={loading}
              style={{
                border: 0,
                padding: "11px 16px",
                borderRadius: 14,
                background: "linear-gradient(135deg,#0f172a,#1e293b)",
                color: "white",
                fontWeight: 950,
                cursor: "pointer",
                opacity: loading ? 0.65 : 1,
                boxShadow: "0 14px 28px rgba(15,23,42,0.22)",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Icon name="calc" />
              {loading ? "Running..." : "Run calculation"}
            </button>
          </div>

          {err && <div style={{ color: "#b91c1c", fontSize: 13, fontWeight: 800 }}>{err}</div>}
        </div>

        {/* Summary Key Outputs */}
        <div style={{ marginTop: 16, ...surface, padding: 16, borderRadius: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 14,
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(16,185,129,0.10)",
                  border: "1px solid rgba(16,185,129,0.22)",
                  color: "#0f172a",
                }}
              >
                <Icon name="money" />
              </div>
              <div>
                <div style={{ ...sectionTitle }}>SUMMARY</div>
                <div style={{ fontSize: 14, fontWeight: 1000, color: "#0f172a", marginTop: 2 }}>Key outputs</div>
              </div>
            </div>
            <Pill>{sections ? "Calculated" : "Not yet run"}</Pill>
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12 }}>
            <div style={{ gridColumn: "span 12" }}>
              <div
                style={{
                  borderRadius: 18,
                  padding: 14,
                  border: "1px solid rgba(16,185,129,0.24)",
                  background:
                    "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(99,102,241,0.10))," +
                    "rgba(248,250,252,0.75)",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 900, color: "#64748b", letterSpacing: ".10em" }}>
                  TOTAL COMPENSATION (YEARLY)
                </div>
                <div style={{ marginTop: 6, fontSize: 26, fontWeight: 1100, color: "#0f172a" }}>
                  {pickValue(sections, "Total Compensation (Yearly)") || "—"}
                </div>
              </div>
            </div>

            <div style={{ gridColumn: "span 3" }}>
              <MiniStat label="Total Base Salaries" value={pickValue(sections, "Total Base Salaries")} />
            </div>
            <div style={{ gridColumn: "span 3" }}>
              <MiniStat label="Total Cheder Stipends" value={pickValue(sections, "Total Cheder Stipends")} />
            </div>
            <div style={{ gridColumn: "span 3" }}>
              <MiniStat label="Total 403(b)" value={pickValue(sections, "Total 403(b)")} />
            </div>

            {/* PDO OUT, CHINUCH FUND IN */}
            <div style={{ gridColumn: "span 3" }}>
              <MiniStat label="Total Chinuch Fund" value={pickValue(sections, "Total Chinuch Fund")} />
            </div>

            {/* NEW: E49 + E87 */}
            <div style={{ gridColumn: "span 6" }}>
              <MiniStat
                label="Estimated After-Tax Disposable"
                value={pickValue(sections, "Estimated after-tax disposable")}
              />
            </div>
            <div style={{ gridColumn: "span 6" }}>
              <MiniStat
                label="All-In Value Including Tuition"
                value={pickValue(sections, "All-in value incl. tuition")}
              />
            </div>
          </div>
        </div>

        {/* Results */}
        <div style={{ marginTop: 16 }}>
          {!filteredSections || filteredSections.length === 0 ? (
            <div style={{ ...surface, padding: 16, color: "#64748b", fontSize: 13 }}>Run a calculation to see outputs.</div>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {filteredSections.map((sec) => {
                if (sec.kind === "rows") return <RowsCard key={sec.title} title={sec.title} rows={sec.rows} />;
                if (sec.kind === "table") return <TableCard key={sec.title} title={sec.title} headers={sec.headers} rows={sec.rows} />;
                return <NoteCard key={sec.title} title={sec.title} value={sec.value} />;
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
