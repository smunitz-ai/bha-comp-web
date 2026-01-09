// app/components/AdditionalCalculationsPanel.tsx
"use client";

import React from "react";

type SheetGrid = (string | number | null | undefined)[][];

type Props = {
  /**
   * A 2D grid of sheet values (rows x columns) where A1 == values[0][0]
   * This matches the common Google Sheets "values" shape.
   *
   * NOTE: During prerender/SSR, this can be undefined if the sheet fetch fails.
   * We handle that safely.
   */
  values?: SheetGrid;

  /**
   * Optional section title override
   */
  title?: string;

  /**
   * Optional: if your app uses a different base (some apps pass a trimmed range),
   * provide the top-left A1 address for `values[0][0]`. Default "A1".
   *
   * Example: if you fetched "A10:Z200", then topLeftA1 should be "A10".
   */
  topLeftA1?: string;
};

function colLettersToIndex(colLetters: string): number {
  // "A"->0, "Z"->25, "AA"->26 ...
  let result = 0;
  const s = colLetters.toUpperCase();
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code < 65 || code > 90) continue;
    result = result * 26 + (code - 64);
  }
  return result - 1;
}

function a1ToRowCol(a1: string): { row: number; col: number } {
  const m = a1.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!m) return { row: 0, col: 0 };
  const [, colLetters, rowStr] = m;
  const col = colLettersToIndex(colLetters);
  const row = Math.max(0, parseInt(rowStr, 10) - 1);
  return { row, col };
}

function safeToNumber(v: any): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;

  const s = String(v).trim();
  if (!s) return null;

  // Remove common currency/commas/percent signs
  const cleaned = s
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .replace(/%/g, "")
    .replace(/\s+/g, "");

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function formatMoney(v: any): string {
  const n = safeToNumber(v);
  if (n === null) return String(v ?? "");
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatMoneyMaybeCents(v: any): string {
  const n = safeToNumber(v);
  if (n === null) return String(v ?? "");
  const s = String(v ?? "");
  const hasCents = /\.\d{1,2}\b/.test(s);
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  });
}

function formatPercent(v: any): string {
  const n = safeToNumber(v);
  if (n === null) return String(v ?? "");
  // Accept either 0.6 or 60 style inputs; if n > 1, treat as percent already
  const p = n > 1 ? n : n * 100;
  return `${p.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}

function getCellFromGrid(values: SheetGrid, a1: string, topLeftA1 = "A1") {
  const tl = a1ToRowCol(topLeftA1);
  const target = a1ToRowCol(a1);

  const r = target.row - tl.row;
  const c = target.col - tl.col;

  if (r < 0 || c < 0) return null;
  if (r >= values.length) return null;
  if (c >= (values[r]?.length ?? 0)) return null;

  return values[r][c];
}

function Row({
  label,
  value,
  colorClass,
  valueFormatter,
  bigValue = false,
  isTotal = false,
}: {
  label: string;
  value: any;
  colorClass: string;
  valueFormatter?: (v: any) => string;
  bigValue?: boolean;
  isTotal?: boolean;
}) {
  const display = valueFormatter ? valueFormatter(value) : String(value ?? "");
  return (
    <div
      className={[
        "flex items-baseline justify-between gap-3",
        "py-2",
        isTotal ? "border-t border-black/10 pt-3" : "",
      ].join(" ")}
    >
      <div className={["text-sm font-medium", colorClass].join(" ")}>{label}</div>
      <div
        className={[
          "text-right tabular-nums",
          colorClass,
          bigValue ? "text-xl font-extrabold" : "text-sm font-semibold",
          isTotal ? "font-extrabold" : "",
        ].join(" ")}
        style={{ fontWeight: bigValue ? 800 : 600 }}
      >
        {display}
      </div>
    </div>
  );
}

export default function AdditionalCalculationsPanel({
  values,
  title = "Additional Calculations",
  topLeftA1 = "A1",
}: Props) {
  // ✅ critical SSR/prerender safety
  const grid: SheetGrid = Array.isArray(values) ? values : [];

  // E49 houses Estimated after-tax disposable
  // E87 houses All-in value incl. tuition (Comp + supports + tuition)
  const afterTaxDisposable = getCellFromGrid(grid, "E49", topLeftA1);
  const allInInclTuition = getCellFromGrid(grid, "E87", topLeftA1);

  const group1 = "text-sky-700";
  const group2 = "text-emerald-700";
  const group3 = "text-violet-700";
  const allIn = "text-slate-900";

  return (
    <section className="w-full">
      <div className="rounded-2xl border border-black/10 bg-white shadow-sm">
        <div className="px-5 py-4 border-b border-black/10">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>

            <div className="flex flex-col items-end">
              <div className="text-xs font-medium text-slate-500">Summary Key Outputs</div>
              <div className="mt-1 flex items-center gap-6">
                <div className="text-right">
                  <div className="text-xs font-medium text-slate-500">Estimated after-tax disposable</div>
                  <div className="text-sm font-extrabold tabular-nums text-slate-900">
                    {formatMoney(afterTaxDisposable)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium text-slate-500">All-in value incl. tuition</div>
                  <div className="text-sm font-extrabold tabular-nums text-slate-900">
                    {formatMoney(allInInclTuition)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Taxes + refunds + disposable
            </div>

            <Row label="Approx parsonage %" value={"0.6"} colorClass={group1} valueFormatter={formatPercent} />
            <Row label="Aprrox Parsonage base $" value={"47280"} colorClass={group1} valueFormatter={formatMoney} />
            <Row label="Effective federal tax owed" value={"0"} colorClass={group1} valueFormatter={formatMoney} />
            <Row
              label="Aprrox Refunds / Credits (CTC + EITC etc.)"
              value={"8274.00"}
              colorClass={group1}
              valueFormatter={formatMoneyMaybeCents}
            />
            <Row
              label="Wisconsin effective tax owed"
              value={"0.00"}
              colorClass={group1}
              valueFormatter={formatMoneyMaybeCents}
            />
            <Row
              label="Aprrox Wisconsin refundable credits"
              value={"2364.00"}
              colorClass={group1}
              valueFormatter={formatMoneyMaybeCents}
            />

            <Row
              label="Estimated after-tax disposable"
              value={afterTaxDisposable}
              colorClass={group1}
              valueFormatter={formatMoney}
              bigValue
              isTotal
            />
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Non-cash + tax-advantaged supports
            </div>

            <Row label="Approx Annual EBT/WIC benefit" value={"13120"} colorClass={group2} valueFormatter={formatMoney} />
            <Row
              label="Approx Marketplace healthcare subsidy (annual)"
              value={"26000"}
              colorClass={group2}
              valueFormatter={formatMoney}
            />
            <Row
              label="Aprrox Free-/reduced-lunch & school meal value"
              value={"3000"}
              colorClass={group2}
              valueFormatter={formatMoney}
            />
            <Row
              label="Approx Real-estate tax savings (org-owned housing)"
              value={"9000"}
              colorClass={group2}
              valueFormatter={formatMoney}
            />
            <Row label="Life insurance" value={"1500"} colorClass={group2} valueFormatter={formatMoney} />
            <Row label="Disability insurance" value={"1500"} colorClass={group2} valueFormatter={formatMoney} />
            <Row
              label="Income-tax savings on parsonage (22 %)"
              value={"10402"}
              colorClass={group2}
              valueFormatter={formatMoney}
            />

            <Row
              label="Total annual non-cash & tax-advantaged value"
              value={"64522"}
              colorClass={group2}
              valueFormatter={formatMoney}
              bigValue
              isTotal
            />
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Employer-provided cash benefits
            </div>

            <Row label="Moving expenses+signing Bonus" value={"5000"} colorClass={group3} valueFormatter={formatMoney} />
            <Row label="Milestone bonus" value={"0"} colorClass={group3} valueFormatter={formatMoney} />
            <Row label="LOW annual contribution" value={"1000"} colorClass={group3} valueFormatter={formatMoney} />
            <Row label="Cheder Tuition" value={"720"} colorClass={group3} valueFormatter={formatMoney} />
            <Row label="Early care" value={"1600"} colorClass={group3} valueFormatter={formatMoney} />
            <Row label="After care" value={"2900"} colorClass={group3} valueFormatter={formatMoney} />
            <Row label="PD Childcare" value={"500"} colorClass={group3} valueFormatter={formatMoney} />

            <Row
              label="Total annual employer provided cash benefits"
              value={"10720"}
              colorClass={group3}
              valueFormatter={formatMoney}
              bigValue
              isTotal
            />
          </div>
        </div>

        <div className="px-5 pb-5">
          <div className="rounded-2xl border border-black/10 bg-slate-50 p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-700">All-in economic value</div>
                <div className="text-xs text-slate-500">(Comp + supports + tuition)</div>
              </div>

              <div className={["tabular-nums", allIn, "text-3xl font-black"].join(" ")}>
                {formatMoney(allInInclTuition)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
