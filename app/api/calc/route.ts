import { NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";

type Payload = {
  tier?: string | number;
  tierA?: string | number;
  tierB?: string | number;
  scenario?: string;

  spouseARole?: string;
  spouseAGender?: string;
  spouseAFTE?: number | string;
  spouseACheder?: string;
  spouseAPDO?: number | string;

  spouseBGender?: string;
  spouseBFTE?: number | string;
  spouseBCheder?: string;
  spouseBPDO?: number | string;

  programYear?: string;
  programYearA?: string;
  programYearB?: string;

  kidsP8?: string | number;
  kidsCheder?: string | number;
  girlsBHH?: string | number;

  perfA?: string;
  perfB?: string;
};

type Section =
  | { kind: "rows"; title: string; rows: { label: string; value: string }[] }
  | { kind: "table"; title: string; headers: string[]; rows: string[][] }
  | { kind: "note"; title: string; value: string };

const PROGRAM_YEAR_TO_TIER: Record<string, string> = {
  "Year 1": "1",
  "Year 2–5": "1",
  "Year 6": "2",
  "Year 7–11": "2",
  "Year 12": "3",
  "Year 13–18": "3",
  "Year 19": "4",
  "Year 20–26": "4",
  "Year 27": "5",
  "Year 28+": "5",
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseMaybeNumber(v: any) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return v;
  const s = String(v).trim();
  if (!s) return "";
  const cleaned = s.replace(/[$,\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : v;
}

function getServiceAccountJson(): any {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_B64;
  if (!b64) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_B64");

  const jsonText = Buffer.from(b64, "base64").toString("utf8");
  return JSON.parse(jsonText);
}

function getSheetsClient() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const tab = process.env.GSHEET_TAB || "Comp Calculator";

  if (!spreadsheetId) throw new Error("Missing GOOGLE_SHEET_ID");

  const creds = getServiceAccountJson();

  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  return { sheets, spreadsheetId, tab };
}

function getCell(vr: any[], idx: number, r = 0, c = 0) {
  return (vr[idx]?.values || [])[r]?.[c] ?? "";
}

function rowsFromTwoCols(grid: string[][], labelColIndex = 0, valueColIndex = 1) {
  const out: { label: string; value: string }[] = [];
  for (const row of grid || []) {
    const label = (row?.[labelColIndex] ?? "").toString().trim();
    const value = (row?.[valueColIndex] ?? "").toString().trim();
    if (!label) continue;
    if (label.toLowerCase() === "totals") continue;
    out.push({ label, value });
  }
  return out;
}

function rowsFromTwoColsWithIndex(grid: string[][], labelColIndex = 0, valueColIndex = 1) {
  const out: { label: string; value: string; rowIndex: number }[] = [];
  (grid || []).forEach((row, i) => {
    const label = (row?.[labelColIndex] ?? "").toString().trim();
    const value = (row?.[valueColIndex] ?? "").toString().trim();
    if (!label) return;
    if (label.toLowerCase() === "totals") return;
    out.push({ label, value, rowIndex: i });
  });
  return out;
}

function pickByLabel(pairs: { label: string; value: string }[], wanted: string[]) {
  const map = new Map<string, string>();
  for (const p of pairs) map.set(p.label.toLowerCase(), p.value);
  return wanted.map((w) => ({ label: w, value: map.get(w.toLowerCase()) ?? "" }));
}

function findLabelRightValuePairs(rect: string[][], wantedLabels: string[]) {
  const wanted = new Map(wantedLabels.map((x) => [x.toLowerCase(), x]));
  const found: { label: string; value: string }[] = [];

  for (const row of rect || []) {
    for (let j = 0; j < row.length; j++) {
      const cell = (row[j] ?? "").toString().trim();
      if (!cell) continue;
      const key = cell.toLowerCase();
      if (wanted.has(key)) {
        const value = (row[j + 1] ?? "").toString().trim();
        found.push({ label: wanted.get(key)!, value });
      }
    }
  }

  const order = new Map(wantedLabels.map((l, i) => [l.toLowerCase(), i]));
  found.sort(
    (a, b) =>
      (order.get(a.label.toLowerCase()) ?? 999) - (order.get(b.label.toLowerCase()) ?? 999)
  );
  return found;
}

async function safeJson(req: Request): Promise<Payload> {
  try {
    const text = await req.text();
    if (!text || !text.trim()) return {};
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function devLogError(tag: string, err: any) {
  console.error(`[api/calc] ${tag}:`, err);
  if (err?.stack) console.error(err.stack);
}

export async function GET() {
  try {
    const { sheets, spreadsheetId, tab } = getSheetsClient();
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${tab}!E9`,
      valueRenderOption: "FORMATTED_VALUE",
    });
    return NextResponse.json({
      ok: true,
      testValue: resp.data.values?.[0]?.[0] ?? null,
    });
  } catch (err: any) {
    devLogError("GET failed", err);
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await safeJson(req);
    const { sheets, spreadsheetId, tab } = getSheetsClient();

    const scenario = String(body.scenario ?? "").trim();
    const oneSpouse = scenario.toLowerCase() === "one spouse";

    const programYearA = body.programYearA ?? body.programYear ?? "";
    const programYearB = oneSpouse ? "" : body.programYearB ?? body.programYearA ?? body.programYear ?? "";

    const derivedTierA = PROGRAM_YEAR_TO_TIER[String(programYearA)] ?? "";
    const derivedTierB = oneSpouse ? "" : PROGRAM_YEAR_TO_TIER[String(programYearB)] ?? "";

    // If One Spouse, clear spouse B inputs so stale values cannot affect spreadsheet formulas.
    const spouseBGender = oneSpouse ? "" : body.spouseBGender ?? "";
    const spouseBFTE = oneSpouse ? "" : parseMaybeNumber(body.spouseBFTE);
    const spouseBCheder = oneSpouse ? "" : body.spouseBCheder ?? "";
    const spouseBPDO = oneSpouse ? "" : parseMaybeNumber(body.spouseBPDO);
    const perfB = oneSpouse ? "" : body.perfB ?? "";

    // 1) Write inputs
    const data = [
      { range: `${tab}!B10`, values: [[body.scenario ?? ""]] },

      { range: `${tab}!B12`, values: [[body.spouseARole ?? ""]] },
      { range: `${tab}!B13`, values: [[body.spouseAGender ?? ""]] },
      { range: `${tab}!B14`, values: [[parseMaybeNumber(body.spouseAFTE)]] },
      { range: `${tab}!B15`, values: [[body.spouseACheder ?? ""]] },
      { range: `${tab}!B16`, values: [[parseMaybeNumber(body.spouseAPDO)]] },

      { range: `${tab}!B19`, values: [[spouseBGender]] },
      { range: `${tab}!B20`, values: [[spouseBFTE]] },
      { range: `${tab}!B21`, values: [[spouseBCheder]] },
      { range: `${tab}!B22`, values: [[spouseBPDO]] },

      // Program years. The sheet should calculate B9 from B63 and B11 from B64.
      { range: `${tab}!B63`, values: [[programYearA]] },
      { range: `${tab}!B64`, values: [[programYearB]] },

      { range: `${tab}!B77`, values: [[parseMaybeNumber(body.kidsP8)]] },
      { range: `${tab}!B78`, values: [[parseMaybeNumber(body.kidsCheder)]] },
      { range: `${tab}!B79`, values: [[parseMaybeNumber(body.girlsBHH)]] },

      { range: `${tab}!F34`, values: [[body.perfA ?? ""]] },
      { range: `${tab}!F35`, values: [[perfB]] },
    ];

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: "USER_ENTERED", data },
    });

    // 2) Poll until a key output is non-empty
    const pollRanges = [`${tab}!E9:E18`, `${tab}!E26:E26`];
    let pollResp: any = null;

    for (let i = 0; i < 8; i++) {
      await sleep(400);
      pollResp = await sheets.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges: pollRanges,
        valueRenderOption: "FORMATTED_VALUE",
      });
      const vr = pollResp.data.valueRanges || [];
      const e9 = (vr[0]?.values || [])[0]?.[0] ?? "";
      const e26 = (vr[1]?.values || [])[0]?.[0] ?? "";
      if (String(e9).trim() !== "" || String(e26).trim() !== "") break;
    }

    // 3) Read outputs
    const ranges = [
      `${tab}!E9:E18`,
      `${tab}!D18:E26`,
      `${tab}!E26:E26`,

      `${tab}!D42:E74`,
      `${tab}!F36:G40`,

      `${tab}!N3:Q21`,
      `${tab}!U1:U1`,

      `${tab}!A60:H110`,

      `${tab}!D83:E85`,
      `${tab}!D87:E87`,
    ];

    const resp = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges,
      valueRenderOption: "FORMATTED_VALUE",
    });

    const vr = resp.data.valueRanges || [];
    const e9_e18 = (vr[0]?.values || []).map((r: any[]) => r?.[0] ?? "");

    const totalsPairs = rowsFromTwoCols(vr[1]?.values || [], 0, 1);
    const totalsRows = pickByLabel(totalsPairs, [
      "Total Base Salaries",
      "Total Cheder Stipends",
      "Total 403(b)",
      "Total PDO Compensation",
      "Total Chinuch Fund",
    ]);

    const e26 = getCell(vr, 2, 0, 0);

    const d42_e74 = vr[3]?.values || [];
    const f36_g40 = vr[4]?.values || [];

    const n3_q21 = vr[5]?.values || [];
    const u1 = getCell(vr, 6, 0, 0);

    const a60_h110 = vr[7]?.values || [];

    const d83_e85 = vr[8]?.values || [];
    const tuitionRows = rowsFromTwoCols(d83_e85, 0, 1).filter((r) => r.value !== "");

    const d87_e87 = vr[9]?.values || [];
    const allInLabelRaw = (d87_e87?.[0]?.[0] ?? "").toString().trim();
    const allInValue = (d87_e87?.[0]?.[1] ?? "").toString().trim();
    const allInLabel = allInLabelRaw || "All-in Value (Including Everything)";

    // Additional Calculations cleanup
    const more1 = rowsFromTwoColsWithIndex(d42_e74, 0, 1)
      .filter((r) => r.value !== "")
      .filter((r) => r.rowIndex !== 2)
      .filter((r) => r.label.trim() !== "Aprrox Income-tax savings on parsonage (22 %)")
      .map(({ label, value }) => ({ label, value }));

    const more2 = rowsFromTwoCols(f36_g40, 0, 1).filter((r) => r.value !== "");

    const childrenWanted = [
      "Children / Tuition savings",
      "# Preschool–8 children",
      "# Kids in BHA/Cheder",
      "# High school girls",
      "Avg tuition saved per P–8 child",
      "Avg tuition saved per HS girl",
    ];

    const childrenRows = findLabelRightValuePairs(a60_h110, childrenWanted)
      .filter((x) => x.label.toLowerCase() !== "children / tuition savings")
      .filter((x) => x.value !== "");

    // 4) Build sections for UI
    const sections: Section[] = [];

    sections.push({
      kind: "rows",
      title: "Compensation",
      rows: [
        { label: "Base Salary – Spouse A", value: e9_e18[0] ?? "" },
        { label: "Base Salary – Spouse B", value: e9_e18[1] ?? "" },
        { label: "Cheder Stipend – Spouse A", value: e9_e18[2] ?? "" },
        { label: "Cheder Stipend – Spouse B", value: e9_e18[3] ?? "" },
        { label: "403(b) – Spouse A (3% of Base)", value: e9_e18[4] ?? "" },
        { label: "403(b) – Spouse B (3% of Base)", value: e9_e18[5] ?? "" },
        { label: "PDO Compensation – Spouse A (Tier≥4)", value: e9_e18[6] ?? "" },
        { label: "PDO Compensation – Spouse B (Tier≥4)", value: e9_e18[7] ?? "" },
        { label: "Chinuch Fund", value: e9_e18[8] ?? "" },
        { label: "Annual Pre-Holiday Performance Bonuses", value: e9_e18[9] ?? "" },
      ],
    });

    sections.push({
      kind: "rows",
      title: "TOTALS",
      rows: totalsRows.filter((r) => String(r.value || "").trim() !== ""),
    });

    sections.push({
      kind: "rows",
      title: "Grand Total",
      rows: [
        { label: "Total Compensation (Yearly)", value: String(e26 ?? "") },
        ...(allInValue ? [{ label: allInLabel, value: allInValue }] : []),
      ],
    });

    if (more1.length) sections.push({ kind: "rows", title: "Additional Calculations", rows: more1 });
    if (tuitionRows.length) sections.push({ kind: "rows", title: "Tuition Benefits", rows: tuitionRows });
    if (more2.length) sections.push({ kind: "rows", title: "Other Calculations", rows: more2 });
    if (childrenRows.length) sections.push({ kind: "rows", title: "Children / Tuition Savings (read-only)", rows: childrenRows });

    if (n3_q21.length) {
      const headers = (n3_q21[0] || []).map((x: any) => String(x ?? ""));
      const rows = (n3_q21.slice(1) || []).map((r: any[]) => (r || []).map((x) => String(x ?? "")));
      sections.push({ kind: "table", title: "Helper Table", headers, rows });
    }

    if (String(u1).trim() !== "") {
      sections.push({ kind: "note", title: "Helper (U1)", value: String(u1) });
    }

    return NextResponse.json({
      ok: true,
      meta: { programYearA, programYearB, derivedTierA, derivedTierB, scenario },
      sections,
    } as any);
  } catch (err: any) {
    devLogError("POST failed", err);
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
